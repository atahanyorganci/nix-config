{...}: {
  perSystem = {pkgs, ...}: {
    packages.nixos-bootstrap = pkgs.writeShellApplication {
      name = "nixos-bootstrap";
      runtimeInputs = with pkgs; [openssh nix nixos-anywhere];
      text = builtins.readFile ./nixos-bootstrap.sh;
    };
  };
}
