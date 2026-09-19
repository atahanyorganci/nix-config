{
  flake.modules.homeManager.fish = {
    pkgs,
    lib,
    config,
    user,
    ...
  }: {
    options.shell.fish.enable = lib.mkEnableOption "fish";
    config = {
      programs.fish = lib.mkIf config.shell.fish.enable {
        enable = true;
        plugins = [
          {
            name = "autopair.fish";
            src = pkgs.fetchFromGitHub {
              owner = "jorgebucaran";
              repo = "autopair.fish";
              rev = "1.0.4";
              sha256 = "sha256-s1o188TlwpUQEN3X5MxUlD/2CFCpEkWu83U9O+wg3VU=";
            };
          }
          {
            name = "${user.username}-config";
            src = ./.;
          }
        ];
      };
    };
  };
}
