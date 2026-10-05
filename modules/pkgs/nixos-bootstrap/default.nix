{inputs, ...}: {
  perSystem = {
    pkgs,
    config,
    ...
  }: {
    packages.nixos-bootstrap = pkgs.writeShellApplication {
      name = "nixos-bootstrap";
      runtimeInputs = with pkgs; [openssh nix nixos-anywhere sops coreutils gnugrep gnused gawk];
      runtimeEnv = {
        NIXOS_KNOWN_HOSTS = "${config.packages.nixos-known-hosts}";
        # Backed-up host identities, installed when a host is recreated.
        NIXOS_SECRETS = "${inputs.secrets}";
      };
      text = builtins.readFile ./nixos-bootstrap.sh;
    };
  };
}
