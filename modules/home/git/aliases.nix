{ lib, config, ... }:
let
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
  enabled = config.git.enable && config.git.aliases.enable;
in
{
  options.git.aliases.enable = lib.mkEnableOption "git aliases";
  config = lib.mkIf enabled {
    home.shellAliases = aliases;
  };
}
