{...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.nixos-bootstrap = pkgs.writeShellApplication {
      name = "nixos-bootstrap";
      runtimeInputs = with pkgs; [openssh nix nixos-anywhere coreutils gnugrep gnused gawk];
      runtimeEnv.NIXOS_KNOWN_HOSTS = "${config.packages.nixos-known-hosts}";
      text = builtins.readFile ./nixos-bootstrap.sh;
    };
  };
}
