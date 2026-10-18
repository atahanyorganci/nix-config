{...}: {
  perSystem = {pkgs, ...}: {
    devShells.default = pkgs.mkShellNoCC {
      shellHook = ''
        corepack install
      '';
      packages = with pkgs; [
        nodejs-slim
        corepack
        awscli2
        doppler
        sops
        ssh-to-age
        age
      ];
    };
  };
}
