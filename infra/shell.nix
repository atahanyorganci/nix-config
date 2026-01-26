{
  perSystem = {pkgs, ...}: {
    devShells.infra = pkgs.mkShell {
      buildInputs = with pkgs; [
        terraform
        awscli2
        doppler
      ];
    };
  };
}
