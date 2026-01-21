{
  lib,
  config,
  ...
}: {
  options.docker.enable = lib.mkEnableOption "Docker";
  config = lib.mkIf config.docker.enable {
    virtualisation = {
      containers.enable = true;
      oci-containers.backend = "docker";
      docker = {
        enable = true;
        enableOnBoot = true;
      };
    };
  };
}
