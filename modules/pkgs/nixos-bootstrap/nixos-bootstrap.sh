# Bootstrap NixOS on a fresh host via nixos-anywhere.
#
# Usage: nixos-bootstrap <ssh-target> <flake-expr>
#
# Installing wipes the target's disk, so it only proceeds on positive evidence
# that the target is a fresh cloud image:
#   - a machine presenting any pinned host key (`hostInventory.ssh.hostKey`)
#     is an installed host and is left alone;
#   - a machine already running NixOS is left alone;
#   - otherwise /etc/os-release must be readable and name an OS listed in
#     NIXOS_BOOTSTRAP_WIPE_IDS (default: ubuntu). An unreadable file, a failed
#     SSH call or any other OS aborts instead of installing.
# Exits 0 without changes when the host is already installed.
LOG_PREFIX=nixos-bootstrap

SSH_OPTS=(
    -o StrictHostKeyChecking=no
    -o UserKnownHostsFile=/dev/null
    -o ConnectTimeout=10
    -o BatchMode=yes
)
export TMPDIR="${TMPDIR:-/tmp}"
export NIX_SSHOPTS="${NIX_SSHOPTS:-} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ControlMaster=auto -o ControlPath=/tmp/nr-%C -o ControlPersist=60"

KNOWN_HOSTS="${NIXOS_KNOWN_HOSTS:?NIXOS_KNOWN_HOSTS must point at the pinned host keys}"
WIPE_IDS="${NIXOS_BOOTSTRAP_WIPE_IDS:-ubuntu}"

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

# Print the target's os-release ID. Fails, printing nothing, when SSH fails
# or the file has no ID, so callers can tell "unknown" from "not NixOS".
# The file is parsed locally: the login shell may not be POSIX (fish).
remote_os_id() {
    local target=$1
    local os_release
    os_release="$(ssh "${SSH_OPTS[@]}" "$target" 'cat /etc/os-release')" || return 1
    local id
    id="$(printf '%s\n' "$os_release" | sed -n 's/^ID=//p' | tr -d "\"'")"
    [[ -n $id ]] || return 1
    printf '%s\n' "$id"
}

# Print the configuration whose pinned host key the target presents, if any.
pinned_host_for() {
    local host=$1
    local key
    key="$(ssh-keyscan -T 10 -t ed25519 "$host" 2> /dev/null | awk '$2 == "ssh-ed25519" && key == "" { key = $3 } END { print key }')"
    [[ -n $key ]] || return 1
    awk -v key="$key" '$2 == "ssh-ed25519" && $3 == key { print $1; found = 1; exit } END { exit !found }' "$KNOWN_HOSTS"
}

SSH_TARGET="${1:?ssh target required (e.g. root@host)}"
FLAKE_EXPR="${2:?flake expression required (e.g. .#pluto)}"

if [[ $FLAKE_EXPR != *"#"* ]]; then
    log "flake expression must include configuration (path#name)"
    exit 2
fi

FLAKE_ROOT="${FLAKE_EXPR%%#*}"
SSH_USER="${SSH_USER:-atahan}"
SSH_HOST="${SSH_TARGET#*@}"

cd "$FLAKE_ROOT" || exit 1

already_installed() {
    log "target already runs NixOS; nothing to bootstrap (use nixos-deploy to update it)"
    exit 0
}

log "waiting for SSH on ${SSH_TARGET}"
ssh_status=0
wait_for_ssh "$SSH_TARGET" 60 || ssh_status=$?

if pinned="$(pinned_host_for "$SSH_HOST")"; then
    log "${SSH_HOST} presents the pinned host key of ${pinned}; refusing to reinstall an installed host"
    already_installed
fi

if ((ssh_status == 2)); then
    # Installed hosts refuse root logins; the deploy user still answers.
    if [[ "$(remote_os_id "${SSH_USER}@${SSH_HOST}" || true)" == nixos ]]; then
        already_installed
    fi
    log "root login was refused and ${SSH_USER}@${SSH_HOST} is not a NixOS host; refusing to bootstrap"
    exit 1
fi
if ((ssh_status != 0)); then
    exit 1
fi

if ! os_id="$(remote_os_id "$SSH_TARGET")"; then
    log "could not read /etc/os-release on ${SSH_TARGET}; refusing to wipe a host it cannot identify"
    exit 1
fi
if [[ $os_id == nixos ]]; then
    already_installed
fi
if [[ " ${WIPE_IDS} " != *" ${os_id} "* ]]; then
    log "${SSH_TARGET} runs '${os_id}', not a fresh image (${WIPE_IDS}); refusing to wipe it"
    log "set NIXOS_BOOTSTRAP_WIPE_IDS to allow installing over '${os_id}'"
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

log "bootstrapping ${FLAKE_EXPR} on ${SSH_TARGET} (currently ${os_id})"
run_nixos_anywhere --phases kexec
wait_for_ssh "$SSH_TARGET" 60

run_nixos_anywhere --phases disko

run_nixos_anywhere --phases install

run_nixos_anywhere --phases reboot

log "waiting for post-install SSH as ${SSH_USER}@${SSH_HOST}"
wait_for_ssh "${SSH_USER}@${SSH_HOST}" 60

log "bootstrap complete"
