{...}: {
  sops.defaultSopsFile = ../../../secrets/dummy.enc.yaml;
  sops.defaultSopsFormat = "yaml";
  sops.secrets = {
    dummy_secret = {};
  };
  sops.gnupg.home = "/Users/atahan/.gnupg";
  sops.gnupg.sshKeyPaths = [];
  sops.age.sshKeyPaths = [];
}
