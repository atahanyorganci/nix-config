{...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.nixos-deploy = pkgs.writeShellApplication {
      name = "nixos-deploy";
      runtimeInputs = with pkgs; [openssh nix nixos-rebuild coreutils gnugrep];
      runtimeEnv.NIXOS_KNOWN_HOSTS = "${config.packages.nixos-known-hosts}";
      text = builtins.readFile ./nixos-deploy.sh;
    };
  };
}
