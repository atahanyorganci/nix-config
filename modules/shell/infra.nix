{
  perSystem = {pkgs, ...}: {
    devShells.infra = pkgs.mkShellNoCC {
      buildInputs = with pkgs; [
        bun
      ];
    };
  };
}
