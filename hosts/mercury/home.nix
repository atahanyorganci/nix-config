{user, ...}: {
  home = {
    username = user.username;
    homeDirectory = "/home/${user.username}";
  };
  # Public keys + gpg CLI; no local agent (use forwarded YubiKey from sol).
  gpg.enable = true;
  gpg.agent.enable = false;
  ffmpeg.enable = true;
  git = {
    enable = true;
    aliases.enable = true;
    user = {
      inherit (user) name email key;
    };
  };
  gum.enable = true;
  python.enable = true;
  shell = {
    bash.enable = true;
    zsh.enable = true;
    fish.enable = true;
  };
  tools.enable = true;
  uutils.enable = true;
  node.enable = true;
  wget.enable = true;
}
