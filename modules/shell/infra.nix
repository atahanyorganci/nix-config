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
        doppler
        # Host secrets in nix-secrets: `sops` edits them with the admin's
        # YubiKey; `ssh-to-age` derives host recipients from SSH host keys.
        sops
        ssh-to-age
        age
      ];
    };
  };
}
