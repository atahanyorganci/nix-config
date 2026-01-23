{
  pkgs,
  config,
  lib,
  ...
}: let
  isDarwin = pkgs.stdenv.hostPlatform.isDarwin;
  includes =
    if isDarwin
    then ["~/.orbstack/ssh/config"]
    else [];
  keyDirContents = builtins.readDir ./keys;
  keyFileNames = builtins.attrNames keyDirContents;
  publicKeys =
    builtins.map (key: {
      source = ./keys/${key};
      trust = 5;
    })
    keyFileNames;
in {
  options.gpg.enable = lib. mkOption {
    type = lib.types.bool;
    default = true;
    description = "Enable GPG";
  };
  config = lib.mkIf config.gpg.enable {
    programs.gpg = {
      enable = true;
      mutableTrust = false;
      inherit publicKeys;
    };
    programs.ssh = {
      enable = true;
      enableDefaultConfig = false;
      inherit includes;
    };
    home.packages = with pkgs; [
      openssl
      yubikey-personalization
      yubikey-manager
    ];
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
  };
}
