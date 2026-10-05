#!/usr/bin/env bash
# Connect a NetBird reverse-proxy cluster: provision a proxy token and store it
# in nix-secrets, where sops-nix installs it on the host.
#
# Usage: connect-proxy.sh [flags] <name> <host>
#        connect-proxy.sh --verify
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${STACK_DIR}/../.." && pwd)"

# Key of the token in hosts/<host>.yaml; modules/hosts/<host>.nix declares it
# as `sops.secrets."netbird-proxy/token"`.
TOKEN_KEY='["netbird-proxy"]["token"]'

SECRETS_DIR="${NIX_SECRETS_DIR:-${REPO_ROOT}/../nix-secrets}"
VERIFY_ONLY=false

NAME=""
HOST=""

usage() {
    cat << 'EOF'
Usage: connect-proxy.sh [flags] <name> <host>
       connect-proxy.sh --verify

Provision a NetBird reverse-proxy access token for <host> and store it,
encrypted, in nix-secrets (hosts/<host>.yaml). sops-nix installs it on <host>
and restarts netbird-proxy once the new secrets revision is deployed:

  1. connect-proxy.sh mars-proxy mars
  2. commit and push nix-secrets
  3. nix flake update secrets --refresh, commit, and deploy mars
  4. connect-proxy.sh --verify

Arguments:
  name         Proxy token name (e.g. mars-proxy)
  host         Host configuration running netbird-proxy (e.g. mars)

Flags:
  --secrets DIR    nix-secrets checkout (default: $NIX_SECRETS_DIR, or
                   nix-secrets next to this repository)
  --verify         Only check that the proxy cluster is online
  -h, --help       Show this help

Run from the infra shell (nix develop .#infra), which provides sops; writing
the token needs the admin key.
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
            --secrets)
                SECRETS_DIR="${2:?--secrets requires a value}"
                shift 2
                ;;
            --verify)
                VERIFY_ONLY=true
                shift
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
                elif [[ -z $HOST ]]; then
                    HOST=$1
                else
                    die "unexpected argument: $1"
                fi
                shift
                ;;
        esac
    done

    $VERIFY_ONLY && return 0
    [[ -n $NAME ]] || die "proxy token name required — run connect-proxy.sh --help"
    [[ -n $HOST ]] || die "host required — run connect-proxy.sh --help"
}

load_cluster_domain() {
    nix eval --raw "${REPO_ROOT}#infra.domain"
}

require_proxy_host() {
    local enabled
    enabled="$(nix eval --json "${REPO_ROOT}#nixosConfigurations.${HOST}.config.netbird-proxy.enable" 2> /dev/null || true)"
    [[ $enabled == true ]] || die "${HOST} is not a NixOS host running netbird-proxy"
    [[ -f "${SECRETS_DIR}/.sops.yaml" ]] || die "${SECRETS_DIR} is not a nix-secrets checkout (pass --secrets DIR)"
    command -v sops > /dev/null || die "sops not found — run from the infra shell (nix develop .#infra)"
    command -v jq > /dev/null || die "jq not found"
}

provision_proxy_token() {
    local -a cmd=(doppler run -- node "${SCRIPT_DIR}/create-proxy-token.ts" "$NAME")

    local line proxy_token
    line="$(cd "$STACK_DIR" && "${cmd[@]}")"
    proxy_token="${line#*$'\t'}"
    [[ -n $proxy_token && $proxy_token != "$line" ]] || die "create-proxy-token did not return a token for ${NAME}"
    printf '%s' "$proxy_token"
}

# The token reaches sops on stdin, JSON-encoded, never as an argument: process
# listings would expose arguments.
store_proxy_token() {
    local proxy_token=$1
    local file="hosts/${HOST}.yaml"

    if [[ -f "${SECRETS_DIR}/${file}" ]]; then
        printf '%s' "$proxy_token" | jq -Rs . |
            (cd "$SECRETS_DIR" && sops set --value-stdin "$file" "$TOKEN_KEY")
    else
        # A new file takes its recipients from .sops.yaml (the admins and HOST).
        local tmp="${SECRETS_DIR}/${file}.tmp"
        printf '%s' "$proxy_token" | jq -Rs '{"netbird-proxy": {"token": .}}' |
            (umask 077 && cd "$SECRETS_DIR" && sops --encrypt --filename-override "$file" \
                --input-type json --output-type yaml /dev/stdin > "$tmp")
        mv "$tmp" "${SECRETS_DIR}/${file}"
    fi
}

verify_cluster() {
    local cluster_domain=$1
    local -a cmd=(doppler run -- node "${SCRIPT_DIR}/list-proxy-clusters.ts" "$cluster_domain")
    local output

    output="$(cd "$STACK_DIR" && "${cmd[@]}")"

    log "NetBird proxy cluster status:"
    while IFS= read -r line; do
        [[ -n $line ]] || continue
        log "  ${line//$'\t'/  }"
    done <<< "$output"

    if ! awk -v d="$cluster_domain" -F'\t' '
		$1 == "online" && $2 == d { found = 1 }
		END { exit !found }
	' <<< "$output"; then
        die "proxy cluster ${cluster_domain} is not online — check netbird-proxy logs on the host (journalctl -u netbird-proxy)"
    fi
    log "proxy cluster ${cluster_domain} is online"
}

main() {
    parse_args "$@"

    local cluster_domain
    cluster_domain="$(load_cluster_domain)"

    if $VERIFY_ONLY; then
        verify_cluster "$cluster_domain"
        return
    fi

    require_proxy_host

    log "provisioning proxy token ${NAME} for ${HOST}"
    local proxy_token
    proxy_token="$(provision_proxy_token)"
    store_proxy_token "$proxy_token"

    log "stored the token in ${SECRETS_DIR}/hosts/${HOST}.yaml. To install it:"
    log "  1. commit and push nix-secrets"
    log "  2. nix flake update secrets --refresh, commit, and deploy ${HOST}"
    log "  3. connect-proxy.sh --verify"
}

main "$@"
