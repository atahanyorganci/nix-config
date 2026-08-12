{...}: {
  perSystem = {pkgs, ...}: {
    packages.nixos-deploy = pkgs.writeShellApplication {
      name = "nixos-deploy";
      runtimeInputs = with pkgs; [openssh nix nixos-rebuild];
      text = builtins.readFile ./nixos-deploy.sh;
    };
  };
}
