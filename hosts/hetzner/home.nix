{user, ...}: {
  home = {
    username = user.username;
    homeDirectory = "/home/${user.username}";
  };
  git.user = {
    inherit (user) name email key;
  };
  shell = {
    bash.enable = true;
    zsh.enable = true;
    fish.enable = true;
  };
}
