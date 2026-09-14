{
  flake.modules.homeManager.git = {
    lib,
    config,
    ...
  }: let
    aliases = {
      g = "git";
      # `git add`
      ga = "git add";
      gaa = "git add --all";
      gapa = "git add --patch";
      # `git branch`
      gb = "git branch";
      gbl = "git branch --list --verbose";
      gbd = "git branch --delete";
      # `git commit`
      gc = "git commit";
      gca = "git commit --amend";
      gcm = "git commit -m";
      # `git checkout`
      gch = "git checkout";
      gchb = "git checkout -b";
      # `git cherry-pick`
      gcp = "git cherry-pick";
      gcpa = "git cherry-pick --abort";
      gcpc = "git cherry-pick --continue";
      # `git fetch`
      gf = "git fetch";
      # `git pull`
      gpl = "git pull";
      # `git push`
      gp = "git push";
      gpf = "git push --force-with-lease";
      # `git rebase`
      gr = "git rebase";
      grc = "git rebase --continue";
      gra = "git rebase --abort";
      gri = "git rebase --interactive";
      # `git status`
      gs = "git status";
      # `git stash`
      gss = "git stash save";
      gsl = "git stash list";
      gsp = "git stash pop";
      # `git checkout`
      gco = "git checkout";
      gcb = "git checkout -b";
      # `git log`
      gl = "git log --oneline --decorate --graph";
      # `git merge`
      gm = "git merge";
      # `git reset`
      grs = "git reset";
      grsh = "git reset --hard";
      # `git tag`
      gt = "git tag";
      gtd = "git tag --delete";
      gtl = "git tag --list";
    };
    signingEnabled = config.git.user.key != null;
  in {
    options.git = {
      enable = lib.mkEnableOption "git";
      aliases.enable = lib.mkEnableOption "git aliases";
      user = {
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
    };
    config = lib.mkIf config.git.enable {
      home.shellAliases = lib.mkIf config.git.aliases.enable aliases;
      programs = {
        git = {
          enable = true;
          lfs.enable = true;
          signing = {
            key = config.git.user.key;
            signByDefault = signingEnabled;
          };
          ignores = [".DS_Store"];
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
            core.editor = "cursor --wait";
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
  };
}
