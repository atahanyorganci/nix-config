{user, ...}: let
  userAppDir = "/Users/${user.username}/Applications/Home Manager Apps";
  systemAppDir = "/System/Applications";
in {
  config = {
    system.defaults = {
      NSGlobalDomain."com.apple.trackpad.enableSecondaryClick" = true;
      dock = {
        mru-spaces = false;
        persistent-apps = [
          {app = "${userAppDir}/Helium.app";}
          {app = "${userAppDir}/Visual Studio Code.app";}
          {app = "${userAppDir}/Cursor.app";}
          {app = "${userAppDir}/Ghostty.app";}
          {app = "${userAppDir}/Whatsapp.app";}
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
