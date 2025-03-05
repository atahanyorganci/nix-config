{ lib
, config
, pkgs
, ...
}:
let
  signingEnabled = config.git.user.key != null;
in
{
  options.git.user = {
    name = lib.mkOption {
      type = lib.types.str;
      description = "The name to use for git commits";
    };
    email = lib.mkOption {
      type = lib.types.str;
      description = "The email to use for git commits";
    };
    key = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      description = "The GPG key to use for signing commits";
    };
  };
  config = lib.mkIf config.git.enable {
    programs.git = {
      enable = true;
      userName = config.git.user.name;
      userEmail = config.git.user.email;
      signing = {
        key = config.git.user.key;
        signByDefault = signingEnabled;
      };
      ignores = [ ".DS_Store" ];
      delta = {
        enable = true;
        options = {
          navigate = true;
        };
      };
      extraConfig = {
        advice.addEmptyPathspec = false;
        init.defaultBranch = "main";
        merge.conflictStyle = "diff3";
        core.editor = "code --wait";
      };
    };
    programs.gh = {
      enable = true;
      gitCredentialHelper.enable = true;
    };
  };
}
