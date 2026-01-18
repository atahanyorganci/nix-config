{ lib
, config
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
    programs = {
      git = {
        enable = true;
        signing = {
          key = config.git.user.key;
          signByDefault = signingEnabled;
        };
        ignores = [ ".DS_Store" ];
        settings = {
          user = {
            name = config.git.user.name;
            email = config.git.user.email;
          };
          advice.addEmptyPathspec = false;
          branch.sort = "-committerdate";
          tag.sort = "version:refname";
          diff = {
            algorithm = "histogram";
            colorMoved = "plain";
            mnemonicPrefix = true;
            renames = true;
          };
          push = {
            followTags = true;
            autoSetupRemote = true;
          };
          fetch = {
            prune = true;
            pruneTags = true;
          };
          init.defaultBranch = "main";
          merge.conflictStyle = "zdiff3";
          core.editor = "code --wait";
          help.autocorrect = "prompt";
          rebase = {
            autoStash = true;
            autoSquash = true;
          };
          pull.rebase = true;
        };
      };
      gh = {
        enable = true;
        gitCredentialHelper.enable = true;
      };
    };
  };
}
