{
  pkgs,
  user,
  ...
}: let
  gpgHome =
    if pkgs.stdenv.hostPlatform.isDarwin
    then "/Users/${user.username}/.gnupg"
    else "/home/${user.username}/.gnupg";
in {
  sops.defaultSopsFile = ../../../secrets/dummy.enc.yaml;
  sops.defaultSopsFormat = "yaml";
  sops.secrets = {
    dummy_secret = {};
  };
  sops.gnupg.home = gpgHome;
  sops.gnupg.sshKeyPaths = [];
  sops.age.sshKeyPaths = [];
}
