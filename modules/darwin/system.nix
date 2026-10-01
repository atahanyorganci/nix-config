{
  flake.modules.darwin.system = {
    inputs,
    pkgs,
    ...
  }: let
    system = pkgs.stdenv.hostPlatform.system;
    # `ghostty` deliberately comes from `pkgs` rather than straight from the
    # cask set: `flake.overlays.ghostty` patches it to expose `$out/bin`, and
    # going direct here would put a second ~62M copy in the closure.
    casks = inputs.nix-casks.packages.${system} // {inherit (pkgs) ghostty;};
    systemAppDir = "/System/Applications";
    # nix-darwin copies every app in `environment.systemPackages` into
    # `/Applications/Nix Apps`, which is what Spotlight, Raycast and Finder
    # launch. Dock tiles must point at those copies: pinning the `/nix/store`
    # bundle instead makes macOS treat the running app as a different bundle
    # (a second Dock tile), and that path changes on every update anyway.
    nixApp = name: {app = "/Applications/Nix Apps/${name}.app";};
  in {
    config = {
      # GUI apps are installed once, system-wide, via `environment.systemPackages`.
      # Home Manager (stateVersion >= 25.11) would otherwise also copy any `.app`
      # in `home.packages` (e.g. Ghostty from `programs.ghostty`) into
      # `~/Applications/Home Manager Apps`, giving Spotlight/Raycast a duplicate.
      home-manager.sharedModules = [
        {targets.darwin.copyApps.enable = false;}
      ];
      environment.systemPackages = with casks; [
        helium-browser
        pkgs.zed-editor
        ghostty
        slack
        whatsapp
        iina
        raycast
        notion
        responsively
      ];
      system.defaults = {
        NSGlobalDomain."com.apple.trackpad.enableSecondaryClick" = true;
        dock = {
          autohide = true;
          mru-spaces = false;
          persistent-apps = [
            (nixApp "Helium")
            (nixApp "Zed")
            (nixApp "Ghostty")
            (nixApp "Slack")
            (nixApp "WhatsApp")
            {app = "${systemAppDir}/Mail.app";}
            {app = "${systemAppDir}/Calendar.app";}
            {app = "${systemAppDir}/Notes.app";}
            {app = "${systemAppDir}/System Settings.app";}
          ];
          show-recents = false;
          tilesize = 48;
          wvous-bl-corner = 1;
          wvous-br-corner = 1;
          wvous-tl-corner = 1;
          wvous-tr-corner = 1;
        };
        finder = {
          AppleShowAllExtensions = true;
          AppleShowAllFiles = true;
          ShowPathbar = true;
          _FXShowPosixPathInTitle = true;
          _FXSortFoldersFirst = true;
        };
        trackpad = {
          Clicking = true;
          TrackpadRightClick = true;
        };
      };
    };
  };
}
