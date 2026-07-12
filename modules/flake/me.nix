{lib, ...}: {
  options.flake.me = lib.mkOption {
    type = lib.types.submodule {
      options = {
        name = lib.mkOption {type = lib.types.str;};
        email = lib.mkOption {type = lib.types.str;};
        username = lib.mkOption {type = lib.types.str;};
        shell = lib.mkOption {type = lib.types.str;};
        key = lib.mkOption {type = lib.types.str;};
        authorizedKeys = lib.mkOption {
          type = lib.types.listOf lib.types.str;
        };
      };
    };
  };
  config.flake.me = {
    name = "Atahan Yorgancı";
    email = "atahanyorganci@hotmail.com";
    username = "atahan";
    shell = "fish";
    key = "277004B9D6B7DCE3";
    authorizedKeys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOjQEQWwP1aWkv4t/nzin3rRn7ueC7HWR+g9Tec1nwuS"
    ];
  };
}
