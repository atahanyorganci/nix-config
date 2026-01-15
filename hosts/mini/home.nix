{ user
, ...
}:
{
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
    fish.enable = true;
    zsh.enable = true;
  };
  tools.enable = true;
  uutils.enable = true;
  wget.enable = true;
}
