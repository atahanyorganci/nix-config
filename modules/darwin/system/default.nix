{
  inputs,
  pkgs,
  ...
}: let
  system = pkgs.stdenv.hostPlatform.system;
  casks = inputs.nix-casks.packages.${system};
  systemAppDir = "/System/Applications";
in {
  config = {
    environment.systemPackages = with casks; [
      helium-browser
      visual-studio-code
      cursor
      ghostty
      slack
      whatsapp
      iina
      raycast
    ];
    system.defaults = {
      NSGlobalDomain."com.apple.trackpad.enableSecondaryClick" = true;
      dock = {
        autohide = true;
        mru-spaces = false;
        persistent-apps = [
          {app = "${casks.helium-browser}/Applications/Helium.app";}
          {app = "${casks.visual-studio-code}/Applications/Visual Studio Code.app";}
          {app = "${casks.cursor}/Applications/Cursor.app";}
          {app = "${casks.ghostty}/Applications/Ghostty.app";}
          {app = "${casks.slack}/Applications/Slack.app";}
          {app = "${casks.whatsapp}/Applications/Whatsapp.app";}
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
}
