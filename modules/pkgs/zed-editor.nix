{
  # nixpkgs' `Zed.app` is only linker-signed: the main executable's ad-hoc
  # signature carries the identifier `zed` and does not bind `Info.plist`.
  # macOS Local Network privacy, however, records its allow rule (System
  # Settings > Privacy & Security > Local Network) under the bundle identifier
  # `dev.zed.Zed`, so the rule never matched the running process. Every
  # connection Zed made to the LAN was silently dropped, which surfaced as
  # `ssh: connect to host venus.local port 22: Undefined error: 0` when opening
  # a remote project, even with the toggle on.
  #
  # Re-signing the bundle ad hoc binds `Info.plist` and makes the signing
  # identifier `dev.zed.Zed`, so the rule applies. This copies the prebuilt
  # output instead of overriding the derivation, which would rebuild Zed from
  # source. The output has no self-references, so the original store path is
  # not kept alive alongside the copy.
  #
  # Done as an overlay so nix-darwin (`modules/darwin/system.nix`) and the
  # Home Manager module (`modules/home/zed`) agree on one store path.
  flake.overlays.zed-editor = final: prev:
    prev.lib.optionalAttrs prev.stdenv.hostPlatform.isDarwin {
      zed-editor = let
        unsigned = prev.zed-editor;
      in
        final.runCommand "zed-editor-${unsigned.version}" {
          nativeBuildInputs = [final.rcodesign];
          inherit (unsigned) pname version meta;
          # `remoteServerExecutableName` and the `remote_server` output are
          # derivation attributes rather than `passthru`; forward them too so
          # this stays a drop-in for `modules/home/zed`.
          passthru =
            unsigned.passthru
            // {inherit unsigned;}
            // prev.lib.getAttrs (prev.lib.filter (n: unsigned ? ${n}) ["remoteServerExecutableName" "remote_server"]) unsigned;
        } ''
          cp -R ${unsigned} $out
          chmod -R u+w $out
          app="$out/Applications/Zed.app"
          # The bundled `git` is a symlink into its own store path. nix-darwin
          # dereferences it when copying the app to `/Applications/Nix Apps`,
          # which would break the seal over `Contents/MacOS`; sign the real file.
          git="$app/Contents/MacOS/git"
          cp --remove-destination "$(readlink -f "$git")" "$git"
          chmod u+w "$git"
          # Without a certificate rcodesign signs ad hoc; the bundle's main
          # executable takes `CFBundleIdentifier` as its signing identifier.
          rcodesign sign "$app"
        '';
    };
}
