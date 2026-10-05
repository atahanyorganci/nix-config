{lib, ...}: {
  options.flake.sops = lib.mkOption {
    type = lib.types.submodule {
      options.admins = lib.mkOption {
        type = lib.types.nonEmptyListOf (lib.types.strMatching "[0-9A-F]{40}");
        description = ''
          Full GPG fingerprints of the people who can read and edit every file
          in the secrets repository (`inputs.secrets`). Hosts are added as
          recipients of their own files only, from their pinned host keys.
        '';
      };
    };
    description = "Recipients of the SOPS-encrypted secrets repository.";
  };

  # The YubiKey-backed personal key (encryption subkey on the card).
  config.flake.sops.admins = ["DC47AAEBB2632BEE427C6077277004B9D6B7DCE3"];
}
