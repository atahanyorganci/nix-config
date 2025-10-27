{ pkgs
, config
, ...
}:
{
  programs.gpg.enable = true;
  programs.ssh = {
    enable = true;
    includes = [ "~/.orbstack/ssh/config" ];
  };
  services.gpg-agent = {
    enable = true;
    enableSshSupport = true;
    enableBashIntegration = config.shell.bash.enable;
    enableFishIntegration = config.shell.fish.enable;
    enableNushellIntegration = config.shell.fish.enable;
    enableZshIntegration = config.shell.zsh.enable;
  };
  home.sessionVariables = {
    SSH_AUTH_SOCK = "${config.home.homeDirectory}/.gnupg/S.gpg-agent.ssh";
  };
}
