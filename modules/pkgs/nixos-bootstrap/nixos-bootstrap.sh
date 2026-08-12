# Bootstrap NixOS on a fresh host via nixos-anywhere.
#
# Usage: nixos-bootstrap <ssh-target> <flake-expr>
LOG_PREFIX=nixos-bootstrap

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

SSH_TARGET="${1:?ssh target required (e.g. root@host)}"
FLAKE_EXPR="${2:?flake expression required (e.g. .#pluto)}"

if [[ $FLAKE_EXPR != *"#"*   ]]; then
    log "flake expression must include configuration (path#name)"
    exit 2
fi

FLAKE_ROOT="${FLAKE_EXPR%%#*}"
SSH_USER="${SSH_USER:-atahan}"
SSH_HOST="${SSH_TARGET#*@}"

cd "$FLAKE_ROOT" || exit 1

log "waiting for SSH on ${SSH_TARGET}"
wait_for_ssh "$SSH_TARGET" 60 || exit 1

if is_nixos "$SSH_TARGET"; then
    log "target is already NixOS; use nixos-deploy instead"
    exit 1
fi

run_nixos_anywhere() {
    # Keep SSH ControlPath under the macOS socket-path limit.
    TMPDIR=/tmp nixos-anywhere \
        --build-on remote \
        --flake "$FLAKE_EXPR" \
        --kexec-extra-flags "-c" \
        --ssh-option StrictHostKeyChecking=no \
        --ssh-option UserKnownHostsFile=/dev/null \
        --target-host "$SSH_TARGET" \
        "$@"
}

log "bootstrapping ${FLAKE_EXPR} on ${SSH_TARGET}"
run_nixos_anywhere --phases kexec
wait_for_ssh "$SSH_TARGET" 60

run_nixos_anywhere --phases disko

run_nixos_anywhere --phases install

run_nixos_anywhere --phases reboot

log "waiting for post-install SSH as ${SSH_USER}@${SSH_HOST}"
wait_for_ssh "${SSH_USER}@${SSH_HOST}" 60

log "bootstrap complete"
