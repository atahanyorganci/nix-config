# Deploy NixOS to a Hetzner server after provisioning.
# Invoked by Alchemy Command.Exec from infra/stack.
#
# Usage: deploy-nixos <server-ip> <server-id> <flake-root> <nixos-configuration> [netbird-dns]
set -euo pipefail

export PATH="@runtimePath@:$PATH"

SERVER_IP="${1:?server IP required}"
SERVER_ID="${2:?server ID required}"
FLAKE_ROOT="${3:?flake root required}"
NIXOS_CONFIGURATION="${4:?NixOS configuration required}"
NETBIRD_DNS="${5:-}"

if [[ ! $SERVER_ID =~ ^[0-9]+$ ]]; then
    printf 'deploy-nixos: server ID must be numeric\n' >&2
    exit 2
fi

FLAKE_REF="${FLAKE_ROOT}#${NIXOS_CONFIGURATION}"
SSH_USER="${SSH_USER:-atahan}"
SSH_OPTS=(
    -o StrictHostKeyChecking=no
    -o UserKnownHostsFile=/dev/null
    -o ConnectTimeout=10
    -o BatchMode=yes
)
export TMPDIR="${TMPDIR:-/tmp}"
export NIX_SSHOPTS="${NIX_SSHOPTS:-} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=/tmp/nr-%C -o ControlPersist=60"

LOCK_DIR="${TMPDIR}/deploy-nixos-${SERVER_ID}.lock"
if ! mkdir "$LOCK_DIR" 2> /dev/null; then
    lock_pid=""
    if [[ -f "${LOCK_DIR}/pid" ]]; then
        lock_pid="$(< "${LOCK_DIR}/pid")"
    fi
    if [[ $lock_pid =~ ^[0-9]+$ ]] && kill -0 "$lock_pid" 2> /dev/null; then
        printf 'deploy-nixos: another deploy for server %s is already running\n' "$SERVER_ID" >&2
        exit 1
    fi
    rmdir "$LOCK_DIR" 2> /dev/null || {
        printf 'deploy-nixos: could not remove stale deploy lock for server %s\n' "$SERVER_ID" >&2
        exit 1
    }
    mkdir "$LOCK_DIR"
fi
printf '%s\n' "$$" > "${LOCK_DIR}/pid"
trap 'rm -f "${LOCK_DIR}/pid"; rmdir "$LOCK_DIR"' EXIT

cd "$FLAKE_ROOT"

log() {
    printf 'deploy-nixos: %s\n' "$*" >&2
}

wait_for_ssh() {
    local user=$1
    local max_attempts=${2:-3}
    local attempt=0
    local ssh_error
    while ((attempt < max_attempts)); do
        if ssh_error="$(ssh "${SSH_OPTS[@]}" "${user}@${SERVER_IP}" true 2>&1)"; then
            return 0
        fi
        if [[ $ssh_error == *"Permission denied"* ]]; then
            log "SSH authentication was refused for ${user}@${SERVER_IP}"
            return 2
        fi
        attempt=$((attempt + 1))
        sleep 5
    done
    log "SSH to ${user}@${SERVER_IP} did not become ready"
    return 1
}

verify_server_identity() {
    local user=$1
    local instance_id
    instance_id="$(ssh "${SSH_OPTS[@]}" "${user}@${SERVER_IP}" \
        'curl --fail --silent --show-error --max-time 5 http://169.254.169.254/hetzner/v1/metadata/instance-id' \
        2> /dev/null)" || {
        log "could not read Hetzner instance metadata from ${user}@${SERVER_IP}"
        return 1
    }

    if [[ $instance_id != "$SERVER_ID" ]]; then
        log "target instance ID ${instance_id:-<empty>} does not match expected ${SERVER_ID}"
        return 1
    fi
}

is_nixos() {
    local user=$1
    ssh "${SSH_OPTS[@]}" "${user}@${SERVER_IP}" \
        'test -f /etc/NIXOS && grep -qx "ID=nixos" /etc/os-release'
}

log "waiting for SSH on ${SERVER_IP} (server ${SERVER_ID}${NETBIRD_DNS:+, dns ${NETBIRD_DNS}})"

# Finished NixOS install: atahan can log in and its OS marker is present.
if is_nixos "$SSH_USER"; then
    verify_server_identity "$SSH_USER" || exit 1
    log "Installed NixOS detected — running nixos-rebuild switch"
    # Build on the x86_64-linux target — never on local aarch64-darwin.
    # Force TMPDIR=/tmp inside nix shell so SSH ControlPath stays under the macOS limit.
    nix shell nixpkgs#nixos-rebuild -c env TMPDIR=/tmp nixos-rebuild switch \
        --flake "$FLAKE_REF" \
        --build-host "${SSH_USER}@${SERVER_IP}" \
        --target-host "${SSH_USER}@${SERVER_IP}" \
        --elevate=sudo
else
    # Only a reachable root host without /etc/NIXOS is safe to bootstrap. An
    # installed NixOS system intentionally rejects root login; do not mistake an
    # authentication failure for a fresh Ubuntu server and reinstall it.
    log "checking whether a fresh bootstrap host is reachable as root"
    # Fresh servers can take several minutes to make SSH available.
    if ! wait_for_ssh root 60; then
        log "Neither installed NixOS (${SSH_USER}) nor a bootstrap root host is accessible; refusing reinstall"
        exit 1
    fi

    verify_server_identity root || exit 1

    if is_nixos root; then
        log "NixOS marker found through root SSH, but ${SSH_USER} authentication failed; refusing reinstall"
        exit 1
    fi

    log "Fresh bootstrap host detected — running nixos-anywhere"
    # Build on the x86_64-linux target — never on local aarch64-darwin.
    nix run "${FLAKE_ROOT}#nixos-anywhere" -- \
        --build-on remote \
        --flake "$FLAKE_REF" \
        --ssh-option StrictHostKeyChecking=no \
        --ssh-option UserKnownHostsFile=/dev/null \
        --target-host "root@${SERVER_IP}"

    log "waiting for post-install SSH as ${SSH_USER}"
    wait_for_ssh "$SSH_USER" 60
fi

log "verifying netbird-server and traefik"
ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SERVER_IP}" \
    'systemctl is-active --quiet netbird-server.service && systemctl is-active --quiet traefik.service'

log "NixOS deploy complete"
