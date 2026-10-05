{inputs, ...}: let
  module = {
    lib,
    config,
    ...
  }: let
    host = config.networking.hostName;
    file = "${inputs.secrets}/hosts/${host}.yaml";
  in {
    sops = {
      # A host reads `hosts/<host>.yaml` from the secrets repository, which is
      # encrypted to the admins and to that host alone. Only that one file is
      # copied into the store: interpolating `inputs.secrets` itself would put
      # the whole repository (other hosts' files, the admin-only identities)
      # into every host's closure.
      defaultSopsFile = lib.mkIf (builtins.pathExists file) (builtins.path {
        path = file;
        name = "${host}-secrets.yaml";
      });

      # Decrypt with the pinned host key (`hostInventory.ssh.hostKey`) and
      # nothing else. sops-nix would otherwise also derive identities from
      # whatever keys `services.openssh.hostKeys` lists.
      age.sshKeyPaths = ["/etc/ssh/ssh_host_ed25519_key"];
      gnupg.sshKeyPaths = [];
    };
  };
in {
  flake.modules.nixos.sops = module;
  flake.modules.darwin.sops = module;
}
