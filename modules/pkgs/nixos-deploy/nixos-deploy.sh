# Deploy a NixOS configuration to an installed host via nixos-rebuild.
#
# Usage: nixos-deploy <ssh-target> <flake-expr>
#
# The target must present the host key pinned for the configuration
# (`hostInventory.ssh.hostKey`); a configuration without a pin is trusted on
# first use. A host already running the evaluated system is left untouched,
# so re-running a deploy is cheap and never disturbs an up-to-date host. Set
# NIXOS_DEPLOY_FORCE=1 to switch anyway.
LOG_PREFIX=nixos-deploy

log() {
    printf '%s: %s\n' "$LOG_PREFIX" "$*" >&2
}

SSH_TARGET="${1:?ssh target required (e.g. atahan@host)}"
FLAKE_EXPR="${2:?flake expression required (e.g. .#mars)}"

if [[ $FLAKE_EXPR != *"#"* ]]; then
    log "flake expression must include configuration (path#name)"
    exit 2
fi

FLAKE_ROOT="${FLAKE_EXPR%%#*}"
HOST_NAME="${FLAKE_EXPR#*#}"
KNOWN_HOSTS="${NIXOS_KNOWN_HOSTS:?NIXOS_KNOWN_HOSTS must point at the pinned host keys}"

SSH_OPTS=(
    -o ConnectTimeout=10
    -o BatchMode=yes
)
if grep -q "^${HOST_NAME} " "$KNOWN_HOSTS"; then
    # Check the key pinned for this configuration, whatever address it is
    # reached at. Nothing else is trusted: not ~/.ssh/known_hosts, not the
    # system-wide file.
    HOST_KEY_OPTS="-o HostKeyAlias=${HOST_NAME} -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${KNOWN_HOSTS} -o GlobalKnownHostsFile=/dev/null"
else
    log "warning: no pinned host key for ${HOST_NAME}; trusting ${SSH_TARGET} on first use"
    log "pin it with hostInventory.ssh.hostKey once the host is installed"
    HOST_KEY_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
fi
read -r -a host_key_opts <<< "$HOST_KEY_OPTS"
SSH_OPTS+=("${host_key_opts[@]}")

export TMPDIR="${TMPDIR:-/tmp}"
export NIX_SSHOPTS="${NIX_SSHOPTS:-} ${HOST_KEY_OPTS} -o ControlMaster=auto -o ControlPath=/tmp/nr-%C -o ControlPersist=60"

host_key_mismatch() {
    log "host key mismatch: ${SSH_TARGET} is not the ${HOST_NAME} pinned in the flake"
    log "either the address now points at another machine, or ${HOST_NAME} was reinstalled"
    log "after a deliberate reinstall, update hostInventory.ssh.hostKey for ${HOST_NAME}"
}

wait_for_ssh() {
    local target=$1
    local max_attempts=${2:-3}
    local attempt=0
    local ssh_error
    while ((attempt < max_attempts)); do
        if ssh_error="$(ssh "${SSH_OPTS[@]}" "$target" true 2>&1)"; then
            return 0
        fi
        if [[ $ssh_error == *"Host key verification failed"* || $ssh_error == *"IDENTIFICATION HAS CHANGED"* ]]; then
            host_key_mismatch
            return 3
        fi
        if [[ $ssh_error == *"Permission denied"* ]]; then
            log "SSH authentication was refused for ${target}"
            return 2
        fi
        attempt=$((attempt + 1))
        sleep 5
    done
    log "SSH to ${target} did not become ready"
    return 1
}

is_nixos() {
    local target=$1
    ssh "${SSH_OPTS[@]}" "$target" \
        'test -f /etc/NIXOS && grep -qx "ID=nixos" /etc/os-release'
}

cd "$FLAKE_ROOT" || exit 1

log "waiting for SSH on ${SSH_TARGET}"
wait_for_ssh "$SSH_TARGET" 36 || exit 1

if ! is_nixos "$SSH_TARGET"; then
    log "target is not NixOS; use nixos-bootstrap instead"
    exit 1
fi

log "evaluating ${FLAKE_EXPR}"
want="$(nix eval --raw ".#nixosConfigurations.${HOST_NAME}.config.system.build.toplevel.outPath")"

if [[ ${NIXOS_DEPLOY_FORCE:-} != 1 ]]; then
    # Both the running system and the boot profile must match: after a
    # `nixos-rebuild test` the first does while the second does not.
    have="$(ssh "${SSH_OPTS[@]}" "$SSH_TARGET" 'readlink -f /run/current-system; readlink -f /nix/var/nix/profiles/system')"
    if [[ $have == "$want"$'\n'"$want" ]]; then
        log "${HOST_NAME} already runs ${want}; nothing to deploy"
        exit 0
    fi
fi

log "deploying ${want} to ${SSH_TARGET}"
# Build on the target — never on the local machine.
# Keep SSH ControlPath under the macOS socket-path limit.
export TMPDIR=/tmp
nixos-rebuild switch \
    --flake "$FLAKE_EXPR" \
    --build-host "$SSH_TARGET" \
    --target-host "$SSH_TARGET" \
    --elevate=sudo

log "deploy complete"
