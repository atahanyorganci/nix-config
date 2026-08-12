# Deploy a NixOS configuration to an installed host via nixos-rebuild.
#
# Usage: nixos-deploy <ssh-target> <flake-expr>
LOG_PREFIX=nixos-deploy

SSH_OPTS=(
    -o StrictHostKeyChecking=no
    -o UserKnownHostsFile=/dev/null
    -o ConnectTimeout=10
    -o BatchMode=yes
)
export TMPDIR="${TMPDIR:-/tmp}"
export NIX_SSHOPTS="${NIX_SSHOPTS:-} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=/tmp/nr-%C -o ControlPersist=60"

log() {
    printf '%s: %s\n' "$LOG_PREFIX" "$*" >&2
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

SSH_TARGET="${1:?ssh target required (e.g. atahan@host)}"
FLAKE_EXPR="${2:?flake expression required (e.g. .#mars)}"

if [[ $FLAKE_EXPR != *"#"*   ]]; then
    log "flake expression must include configuration (path#name)"
    exit 2
fi

FLAKE_ROOT="${FLAKE_EXPR%%#*}"

cd "$FLAKE_ROOT" || exit 1

log "waiting for SSH on ${SSH_TARGET}"
wait_for_ssh "$SSH_TARGET" 36 || exit 1

if ! is_nixos "$SSH_TARGET"; then
    log "target is not NixOS; use nixos-bootstrap instead"
    exit 1
fi

log "deploying ${FLAKE_EXPR} to ${SSH_TARGET}"
# Build on the x86_64-linux target — never on local aarch64-darwin.
# Keep SSH ControlPath under the macOS socket-path limit.
export TMPDIR=/tmp
nixos-rebuild switch \
    --flake "$FLAKE_EXPR" \
    --build-host "$SSH_TARGET" \
    --target-host "$SSH_TARGET" \
    --elevate=sudo

log "deploy complete"
