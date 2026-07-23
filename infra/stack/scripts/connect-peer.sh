#!/usr/bin/env bash
# Reconnect a single NetBird peer: provision a setup key, push it over SSH, re-register.
#
# Usage: connect-peers.sh [flags] <peer> <ssh-target> <os>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${STACK_DIR}/../.." && pwd)"

SETUP_KEY_FILE="/var/lib/netbird-client/setup.key"

STAGE="${STAGE:-dev_${USER}}"
PROFILE="${ALCHEMY_PROFILE:-default}"
ENV_FILE=""
MANAGEMENT_URL="${NETBIRD_MANAGEMENT_URL:-}"
SSH_USER="${SSH_USER:-$USER}"

PEER=""
SSH_TARGET=""
OS=""

SSH_OPTS=(
	-o BatchMode=yes
	-o ConnectTimeout=10
	-o StrictHostKeyChecking=accept-new
)

usage() {
	cat <<'EOF'
Usage: connect-peers.sh [flags] <peer> <ssh-target> <os>

Reconnect one NetBird peer by provisioning a one-off setup key, pushing it to
the host over SSH, and running netbird down/up.

Arguments:
  peer         NetBird peer name (setup key label, e.g. mars, mercury, venus)
  ssh-target   SSH hostname or address (e.g. mercury, mars.yorganci.dev)
  os           Host OS: nixos | darwin

Flags:
  --stage STAGE            Alchemy stage (defaults to dev_${USER})
  --profile PROFILE        Alchemy auth profile (defaults to $ALCHEMY_PROFILE or default)
  --env-file PATH          Environment file for Alchemy (same as create-setup-keys.ts)
  --management-url URL     NetBird management URL (defaults to $NETBIRD_MANAGEMENT_URL or flake)
  --ssh-user USER          SSH login user (defaults to $SSH_USER or $USER)
  -h, --help               Show this help
EOF
}

log() {
	printf 'connect-peers: %s\n' "$*" >&2
}

die() {
	log "$*"
	exit 1
}

parse_args() {
	while (($# > 0)); do
		case "$1" in
			--stage)
				STAGE="${2:?--stage requires a value}"
				shift 2
				;;
			--profile)
				PROFILE="${2:?--profile requires a value}"
				shift 2
				;;
			--env-file)
				ENV_FILE="${2:?--env-file requires a value}"
				shift 2
				;;
			--management-url)
				MANAGEMENT_URL="${2:?--management-url requires a value}"
				shift 2
				;;
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
				if [[ -z $PEER ]]; then
					PEER=$1
				elif [[ -z $SSH_TARGET ]]; then
					SSH_TARGET=$1
				elif [[ -z $OS ]]; then
					OS=$1
				else
					die "unexpected argument: $1"
				fi
				shift
				;;
		esac
	done

	[[ -n $PEER ]] || die "peer name required — run connect-peers.sh --help"
	[[ -n $SSH_TARGET ]] || die "ssh-target required — run connect-peers.sh --help"
	[[ -n $OS ]] || die "os required (nixos or darwin) — run connect-peers.sh --help"

	case "$OS" in
		nixos | darwin) ;;
		*)
			die "os must be nixos or darwin (got: ${OS})"
			;;
	esac
}

load_management_url() {
	if [[ -n $MANAGEMENT_URL ]]; then
		return 0
	fi

	local domain
	domain="$(nix eval --raw "${REPO_ROOT}#infra.netbirdManagementDomain")"
	MANAGEMENT_URL="https://${domain}"
}

provision_setup_key() {
	local -a cmd=(bun "${SCRIPT_DIR}/create-setup-keys.ts" --stage "$STAGE" --profile "$PROFILE")
	if [[ -n $ENV_FILE ]]; then
		cmd+=(--env-file "$ENV_FILE")
	fi
	cmd+=("$PEER")

	cd "$STACK_DIR"
	local line setup_key
	line="$("${cmd[@]}")"
	setup_key="${line#*$'\t'}"
	[[ -n $setup_key && $setup_key != "$line" ]] || die "create-setup-keys did not return a key for ${PEER}"
	printf '%s' "$setup_key"
}

install_setup_key() {
	local setup_key=$1
	local sudo_cmd=sudo
	if [[ $OS == nixos ]]; then
		sudo_cmd=/run/wrappers/bin/sudo
	fi

	printf '%s\n' "$setup_key" | ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" \
		"${sudo_cmd} mkdir -p \"$(dirname "$SETUP_KEY_FILE")\" && ${sudo_cmd} tee \"${SETUP_KEY_FILE}\" > /dev/null && ${sudo_cmd} chmod 600 \"${SETUP_KEY_FILE}\""
}

reconnect_netbird_remote() {
	ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" \
		env MANAGEMENT_URL="$MANAGEMENT_URL" SETUP_KEY_FILE="$SETUP_KEY_FILE" OS="$OS" bash -s <<'REMOTE'
set -euo pipefail

export PATH="/run/wrappers/bin:/run/current-system/sw/bin:${PATH:-/usr/bin:/bin}"
SUDO="${SUDO:-sudo}"
if [[ $OS == nixos && -x /run/wrappers/bin/sudo ]]; then
	SUDO=/run/wrappers/bin/sudo
fi

find_netbird_bin() {
	local candidate unit_wrapper

	case "$OS" in
		nixos) candidate=netbird-wt0 ;;
		darwin) candidate=netbird ;;
		*)
			printf 'unsupported os: %s\n' "$OS" >&2
			return 1
			;;
	esac

	if command -v "$candidate" > /dev/null 2>&1; then
		command -v "$candidate"
		return 0
	fi
	if [[ -x "/run/current-system/sw/bin/$candidate" ]]; then
		printf '/run/current-system/sw/bin/%s\n' "$candidate"
		return 0
	fi

	if [[ $OS == nixos ]] && command -v systemctl > /dev/null; then
		unit_wrapper="$(
			systemctl show netbird-wt0.service -p ExecStart --value 2>/dev/null \
				| grep -oE '/nix/store/[^ ;]+' \
				| head -1
		)"
		if [[ -n $unit_wrapper && -x $unit_wrapper ]]; then
			printf '%s\n' "$unit_wrapper"
			return 0
		fi
	fi

	return 1
}

netbird_bin="$(find_netbird_bin || true)"
[[ -n $netbird_bin ]] || {
	printf 'netbird CLI not found for os=%s\n' "$OS" >&2
	exit 1
}

wait_for_daemon() {
	local attempt
	for attempt in $(seq 1 60); do
		if "$SUDO" "$netbird_bin" status > /dev/null 2>&1; then
			return 0
		fi
		sleep 1
	done
	printf 'netbird daemon not ready\n' >&2
	return 1
}

case "$OS" in
	nixos)
		"$SUDO" systemctl restart netbird-wt0.service
		;;
	darwin)
		"$SUDO" launchctl kickstart -k system/org.nixos.netbird 2>/dev/null || true
		;;
esac

wait_for_daemon

"$SUDO" "$netbird_bin" down 2>/dev/null || true

if [[ $OS == nixos ]]; then
	"$SUDO" systemctl stop netbird-wt0-login.service 2>/dev/null || true
fi

"$SUDO" "$netbird_bin" up \
	--management-url "$MANAGEMENT_URL" \
	--setup-key-file "$SETUP_KEY_FILE"

"$SUDO" "$netbird_bin" status
REMOTE
}

verify_peer() {
	local -a cmd=(bun "${SCRIPT_DIR}/list-peers.ts" --stage "$STAGE" --profile "$PROFILE")
	local output

	if [[ -n $ENV_FILE ]]; then
		cmd+=(--env-file "$ENV_FILE")
	fi
	cmd+=("$PEER")

	sleep 5

	cd "$STACK_DIR"
	output="$("${cmd[@]}")"

	log "NetBird peer status:"
	while IFS= read -r line; do
		[[ -n $line ]] || continue
		log "  ${line//$'\t'/  }"
	done <<< "$output"

	if ! awk -v h="$PEER" -F'\t' '
		$1 == "connected" && ($2 == h || $3 == h || index($3, h ".") == 1) { found = 1 }
		END { exit !found }
	' <<< "$output"; then
		die "peer ${PEER} is not connected in NetBird — check remote netbird status/logs"
	fi
}

main() {
	parse_args "$@"
	load_management_url

	if ! ssh "${SSH_OPTS[@]}" "${SSH_USER}@${SSH_TARGET}" true 2> /dev/null; then
		die "SSH to ${SSH_USER}@${SSH_TARGET} failed"
	fi

	log "connecting ${PEER} via ${SSH_USER}@${SSH_TARGET} (${OS})"

	local setup_key
	setup_key="$(provision_setup_key)"

	install_setup_key "$setup_key"
	reconnect_netbird_remote
	verify_peer

	log "reconnected ${PEER}"
}

main "$@"
