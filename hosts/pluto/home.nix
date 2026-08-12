{user, ...}: {
  home = {
    username = user.username;
    homeDirectory = "/home/${user.username}";
  };
  gpg.enable = true;
  gpg.agent.enable = false;
  git.user = {
    inherit (user) name email key;
  };
  shell = {
    bash.enable = true;
    zsh.enable = true;
    fish.enable = true;
  };
}
