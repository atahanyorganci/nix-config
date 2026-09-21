{...}: {
  perSystem = {pkgs, ...}: {
    devShells.infra = pkgs.mkShellNoCC {
      shellHook = ''
        corepack install
      '';
      packages = with pkgs; [
        nodejs-slim
        corepack
        awscli2
      ];
    };
  };
}
