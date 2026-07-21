#!/usr/bin/env bash
# Deploy NixOS to mars after Hetzner provisioning.
# Invoked by Alchemy Command.Exec from infra/stack.
#
# Usage: deploy-mars-nixos.sh <mars-ip> <mars-server-id> [netbird-dns]
set -euo pipefail

MARS_IP="${1:?mars ip required}"
MARS_SERVER_ID="${2:?mars server id required}"
NETBIRD_DNS="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# infra/stack/scripts -> repo root
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
SSH_USER="${SSH_USER:-atahan}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 -o BatchMode=yes)
export TMPDIR="${TMPDIR:-/tmp}"
export NIX_SSHOPTS="${NIX_SSHOPTS:-} -o StrictHostKeyChecking=accept-new -o ControlMaster=auto -o ControlPath=/tmp/nr-%C -o ControlPersist=60"

cd "$REPO_ROOT"

log() {
    printf 'mars-nixos: %s\n' "$*" >&2
}

wait_for_ssh() {
    local user=$1
    local attempt=0
    local max_attempts=3
    local ssh_error
    while ((attempt < max_attempts)); do
        if ssh_error="$(ssh "${SSH_OPTS[@]}" "${user}@${MARS_IP}" true 2>&1)"; then
            return 0
        fi
        if [[ $ssh_error == *"Permission denied"* ]]; then
            log "SSH authentication was refused for ${user}@${MARS_IP}"
            return 2
        fi
        attempt=$((attempt + 1))
        sleep 5
    done
    log "SSH to ${user}@${MARS_IP} did not become ready"
    return 1
}

# Drop stale host keys when the VM behind the Primary IP was replaced.
ssh-keygen -R "$MARS_IP" > /dev/null 2>&1 || true

log "waiting for SSH on ${MARS_IP} (server ${MARS_SERVER_ID}${NETBIRD_DNS:+, dns ${NETBIRD_DNS}})"

# Finished NixOS install: atahan can log in and /etc/NIXOS exists.
if ssh "${SSH_OPTS[@]}" "${SSH_USER}@${MARS_IP}" 'test -f /etc/NIXOS' 2> /dev/null; then
    log "Installed NixOS detected — running nixos-rebuild switch"
    # Build on the x86_64-linux target — never on local aarch64-darwin.
    # Force TMPDIR=/tmp inside nix shell so SSH ControlPath stays under the macOS limit.
    nix shell nixpkgs#nixos-rebuild -c env TMPDIR=/tmp nixos-rebuild switch \
        --flake "${REPO_ROOT}#mars" \
        --build-host "${SSH_USER}@${MARS_IP}" \
        --target-host "${SSH_USER}@${MARS_IP}" \
        --elevate=sudo
else
    # Only a reachable root host without /etc/NIXOS is safe to bootstrap. An
    # installed NixOS system intentionally rejects root login; do not mistake an
    # authentication failure for a fresh Ubuntu server and reinstall it.
    log "checking whether a fresh bootstrap host is reachable as root"
    if ! wait_for_ssh root; then
        log "Neither installed NixOS (${SSH_USER}) nor a bootstrap root host is accessible; refusing reinstall"
        exit 1
    fi

    if ssh "${SSH_OPTS[@]}" "root@${MARS_IP}" 'test -f /etc/NIXOS'; then
        log "NixOS marker found through root SSH, but ${SSH_USER} authentication failed; refusing reinstall"
        exit 1
    fi

    log "Fresh bootstrap host detected — running nixos-anywhere"
    # Build on the x86_64-linux target — never on local aarch64-darwin.
    nix run github:nix-community/nixos-anywhere -- \
        --build-on remote \
        --flake "${REPO_ROOT}#mars" \
        --target-host "root@${MARS_IP}"

    ssh-keygen -R "$MARS_IP" > /dev/null 2>&1 || true
    log "waiting for post-install SSH as ${SSH_USER}"
    wait_for_ssh "$SSH_USER"
fi

log "verifying netbird-server and traefik"
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${MARS_IP}" \
    'systemctl is-active --quiet netbird-server.service && systemctl is-active --quiet traefik.service'

log "mars NixOS deploy complete"
