{lib, ...}: {
  perSystem = {pkgs, ...}: let
    deployScript =
      builtins.replaceStrings
      ["@runtimePath@"]
      [(lib.makeBinPath [pkgs.openssh pkgs.curl pkgs.nix])]
      (builtins.readFile ./deploy-nixos.sh);
  in {
    packages.deploy-nixos = pkgs.writeShellScriptBin "deploy-nixos" deployScript;
  };
}
