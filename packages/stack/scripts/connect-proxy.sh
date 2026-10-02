#!/usr/bin/env bash
# Connect a NetBird reverse-proxy cluster: provision a proxy token, push it over SSH, restart proxy.
#
# Usage: connect-proxy.sh [flags] <name> <ssh-target> [os]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${STACK_DIR}/../.." && pwd)"

PROXY_TOKEN_FILE="/var/lib/netbird-proxy/token"
PROXY_SERVICE="netbird-proxy.service"

SSH_USER="${SSH_USER:-$USER}"

NAME=""
SSH_TARGET=""
OS="nixos"

SSH_OPTS=(
    -o BatchMode=yes
    -o ConnectTimeout=10
    -o StrictHostKeyChecking=accept-new
)

usage() {
    cat << 'EOF'
Usage: connect-proxy.sh [flags] <name> <ssh-target> [os]

Provision a NetBird reverse-proxy access token, install it on the host, and
restart netbird-proxy so the cluster registers with management.

Arguments:
  name         Proxy token name (e.g. mars-proxy)
  ssh-target   SSH hostname or address (e.g. mars, mars.yorganci.dev)
  os           Host OS (default: nixos)

Flags:
  --ssh-user USER          SSH login user (defaults to $SSH_USER or $USER)
  -h, --help               Show this help
EOF
}

log() {
    printf 'connect-proxy: %s\n' "$*" >&2
}

die() {
    log "$*"
    exit 1
}

parse_args() {
    while (($# > 0)); do
        case "$1" in
            --ssh-user)
                SSH_USER="${2:?--ssh-user requires a value}"
                shift 2
                ;;
            -h | --help)
                usage
                exit 0
                ;;
            --*)
                die "unknown flag: $1"
                ;;
            *)
                if [[ -z $NAME ]]; then
                    NAME=$1
                elif [[ -z $SSH_TARGET ]]; then
                    SSH_TARGET=$1
                elif [[ $1 != nixos ]]; then
                    die "unexpected argument: $1"
                else
                    OS=$1
                fi
                shift
                ;;
        esac
    done

    [[ -n $NAME ]] || die "proxy token name required — run connect-proxy.sh --help"
    [[ -n $SSH_TARGET ]] || die "ssh-target required — run connect-proxy.sh --help"

    case "$OS" in
        nixos) ;;
        *)
            die "os must be nixos (got: ${OS}) — netbird-proxy is only configured for NixOS hosts"
            ;;
    esac
}

load_cluster_domain() {
    nix eval --raw "${REPO_ROOT}#infra.domain"
}

provision_proxy_token() {
    local -a cmd=(doppler run -- node "${SCRIPT_DIR}/create-proxy-token.ts" "$NAME")

    cd "$STACK_DIR"
    local line proxy_token
    line="$("${cmd[@]}")"
    proxy_token="${line#*$'\t'}"
    [[ -n $proxy_token && $proxy_token != "$line" ]] || die "create-proxy-token did not return a token for ${NAME}"
    printf '%s' "$proxy_token"
}

install_proxy_token() {
    local proxy_token=$1
    local token_dir remote_cmd
    token_dir=$(dirname "$PROXY_TOKEN_FILE")

    # Expand constant paths on the client; printf %q escapes for the remote shell.
    remote_cmd="/run/wrappers/bin/sudo mkdir -p $(printf %q "$token_dir") && /run/wrappers/bin/sudo tee $(printf %q "$PROXY_TOKEN_FILE") > /dev/null && /run/wrappers/bin/sudo chown netbird-proxy:netbird-proxy $(printf %q "$PROXY_TOKEN_FILE") && /run/wrappers/bin/sudo chmod 640 $(printf %q "$PROXY_TOKEN_FILE")"

    printf '%s\n' "$proxy_token" | ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" "$remote_cmd"
}

restart_proxy_remote() {
    ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" \
        env PROXY_SERVICE="$PROXY_SERVICE" bash -s << 'REMOTE'
set -euo pipefail

export PATH="/run/wrappers/bin:/run/current-system/sw/bin:${PATH:-/usr/bin:/bin}"
SUDO=/run/wrappers/bin/sudo

wait_for_service() {
	local attempt
	for attempt in $(seq 1 60); do
		if $SUDO systemctl is-active --quiet "$PROXY_SERVICE"; then
			return 0
		fi
		sleep 1
	done
	printf 'netbird-proxy service did not become active\n' >&2
	return 1
}

$SUDO systemctl restart "$PROXY_SERVICE"
wait_for_service

$SUDO systemctl status "$PROXY_SERVICE" --no-pager --lines=5
REMOTE
}

verify_cluster() {
    local cluster_domain=$1
    local -a cmd=(doppler run -- node "${SCRIPT_DIR}/list-proxy-clusters.ts" "$cluster_domain")
    local output

    sleep 5

    cd "$STACK_DIR"
    output="$("${cmd[@]}")"

    log "NetBird proxy cluster status:"
    while IFS= read -r line; do
        [[ -n $line ]] || continue
        log "  ${line//$'\t'/  }"
    done <<< "$output"

    if ! awk -v d="$cluster_domain" -F'\t' '
		$1 == "online" && $2 == d { found = 1 }
		END { exit !found }
	' <<< "$output"; then
        die "proxy cluster ${cluster_domain} is not online — check remote netbird-proxy logs (journalctl -u netbird-proxy)"
    fi
}

main() {
    parse_args "$@"

    local cluster_domain
    cluster_domain="$(load_cluster_domain)"

    if ! ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" true 2> /dev/null; then
        die "SSH to ${SSH_USER}@${SSH_TARGET} failed"
    fi

    log "connecting proxy ${NAME} via ${SSH_USER}@${SSH_TARGET} (${OS})"

    local proxy_token
    proxy_token="$(provision_proxy_token)"

    install_proxy_token "$proxy_token"
    restart_proxy_remote
    verify_cluster "$cluster_domain"

    log "connected proxy cluster ${cluster_domain} on ${SSH_TARGET}"
}

main "$@"
