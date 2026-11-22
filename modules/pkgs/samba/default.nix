# Samba for macOS hosts.
#
# - Install names: nixpkgs' Darwin `postFixup` rewrites library references
#   that point into the build tree (`$NIX_BUILD_TOP`), including the RPC
#   helpers in `libexec/samba` and the Python modules. A reference it misses
#   leaves `smbd` aborting in dyld, so the build fails if one survives.
# - Bonjour: `smbd/dnsregister.c` already speaks Apple's DNS-SD API, but no
#   configure check enables it since the autotools build was dropped. The
#   patch enables it on Darwin and extends it to what `avahi_register.c`
#   advertises on Linux: `_smb._tcp`, `_device-info._tcp` (Finder icon, from
#   `fruit:model`) and `_adisk._tcp` (Time Machine shares, from
#   `fruit:time machine`). Turned on by `multicast dns register = yes`.
#
# Linux keeps the stock package (and its binary cache).
{
  flake.overlays.samba = _final: prev: {
    samba =
      if !prev.stdenv.hostPlatform.isDarwin
      then prev.samba
      else
        prev.samba.overrideAttrs (old: {
          patches = (old.patches or []) ++ [./dnssd-bonjour-registration.patch];

          # Upstream does the rewriting; this only proves it left nothing
          # pointing outside the store or the OS.
          postFixup =
            old.postFixup
            + ''
              unresolved=0
              while IFS= read -r -d "" file; do
                refs="$(otool -L "$file" 2>/dev/null | awk 'NR > 1 { print $1 }' \
                  | grep -vE '^(/nix/store/|/usr/lib/|/System/|@)' || true)"
                if [ -n "$refs" ]; then
                  echo "unresolved install names in $file:" >&2
                  echo "$refs" >&2
                  unresolved=1
                fi
              done < <(find "$out" -type f \( -name '*.dylib' -o -perm -u+x \) -print0)
              if [ "$unresolved" -ne 0 ]; then
                exit 1
              fi
            '';

          meta =
            old.meta
            // {
              description = "${old.meta.description} (with Bonjour registration on macOS)";
            };
        });
  };

  perSystem = {
    pkgs,
    lib,
    ...
  }: let
    isDarwin = pkgs.stdenv.hostPlatform.isDarwin;
  in {
    packages = lib.optionalAttrs isDarwin {
      inherit (pkgs) samba;
    };

    # Starts an unprivileged smbd on loopback and reads a file back through
    # smbclient, so a dyld or module-loading regression fails the flake
    # check instead of the launchd service.
    checks = lib.optionalAttrs isDarwin {
      samba-smoke =
        pkgs.runCommand "samba-smoke" {
          nativeBuildInputs = [pkgs.samba];
          __darwinAllowLocalNetworking = true;
        } ''
          set -euo pipefail

          smbd -b | grep -qx '   WITH_DNSSD_SUPPORT' || {
            echo "smbd was built without DNS-SD (Bonjour) support" >&2
            exit 1
          }

          root="$TMPDIR/samba"
          mkdir -p "$root"/{private,lock,state,cache,pid,log,share}
          echo hello > "$root/share/hello.txt"
          port=44545

          cat > "$root/smb.conf" <<EOF
          [global]
            smb ports = $port
            interfaces = 127.0.0.1
            bind interfaces only = yes
            private dir = $root/private
            lock directory = $root/lock
            state directory = $root/state
            cache directory = $root/cache
            pid directory = $root/pid
            ncalrpc dir = $root/lock/ncalrpc
            log file = $root/log/%m.log
            multicast dns register = no
            map to guest = Bad User
            guest account = $(id -un)
            vfs objects = catia fruit streams_xattr
            fruit:metadata = stream
          [share]
            path = $root/share
            read only = yes
            guest ok = yes
          EOF

          smbd -s "$root/smb.conf" --foreground --no-process-group --debug-stdout -d1 \
            > "$root/log/smbd.out" 2>&1 &
          smbd_pid=$!
          trap 'kill "$smbd_pid" 2>/dev/null || true' EXIT

          for _ in $(seq 1 30); do
            if smbclient -s "$root/smb.conf" -p "$port" -N -L //127.0.0.1 >/dev/null 2>&1; then
              break
            fi
            sleep 1
          done

          smbclient -s "$root/smb.conf" -p "$port" -N //127.0.0.1/share \
            -c "get hello.txt $root/fetched.txt" || {
            cat "$root/log/smbd.out" >&2
            exit 1
          }
          grep -qx hello "$root/fetched.txt"

          touch $out
        '';
    };
  };
}
