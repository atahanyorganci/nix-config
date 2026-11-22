# macOS NFS client settings (/etc/nfs.conf, see nfs.conf(5)).
#
# macOS ships /etc/nfs.conf with nothing but a comment header, so nix-darwin
# may replace it only while it still has that content: the hash below is of
# the stock file. If a macOS update ships a different one, activation stops
# with "Unexpected files in /etc"; check the new file and add its hash.
{
  flake.modules.darwin.nfs-client = {
    config,
    lib,
    ...
  }: let
    cfg = config.nfsClient;
    inherit (lib) concatStrings mapAttrsToList mkEnableOption mkIf mkOption optionalAttrs types;

    renderValue = value:
      if builtins.isBool value
      then
        (
          if value
          then "1"
          else "0"
        )
      else toString value;

    settings =
      optionalAttrs (cfg.nfs4Domain != null) {
        "nfs.client.default_nfs4domain" = cfg.nfs4Domain;
      }
      // cfg.settings;
  in {
    options.nfsClient = {
      enable = mkEnableOption "managed NFS client settings in /etc/nfs.conf";

      nfs4Domain = mkOption {
        type = types.nullOr types.str;
        default = null;
        example = "example.com";
        description = ''
          NFSv4 ID-mapping domain (`nfs.client.default_nfs4domain`). Must match
          the server's NFSv4 domain, or file owners show up as nobody.
        '';
      };

      settings = mkOption {
        type = types.attrsOf (types.oneOf [types.str types.int types.bool]);
        default = {};
        example = {"nfs.client.mount.options" = "vers=4.1";};
        description = "Further `nfs.conf` settings, by full key.";
      };

      stockSha256 = mkOption {
        type = types.listOf types.str;
        default = ["933a32202a6ca9d47c1a0af25f8577369b0134ce749002de1228f2b23a909142"];
        description = "Hashes of Apple's stock /etc/nfs.conf that nix-darwin may replace.";
      };
    };

    config = mkIf cfg.enable {
      environment.etc."nfs.conf" = {
        text =
          ''
            #
            # nfs.conf: the NFS configuration file (managed by nix-darwin)
            #
          ''
          + concatStrings (mapAttrsToList (key: value: "${key} = ${renderValue value}\n") settings);
        knownSha256Hashes = cfg.stockSha256;
      };
    };
  };
}
