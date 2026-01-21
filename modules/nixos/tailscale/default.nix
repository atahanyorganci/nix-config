{
  lib,
  config,
  ...
}: let
  cfg = config.tailscale;
in {
  options.tailscale = {
    enable = lib.mkEnableOption "Tailscale";
    domain = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "your-tailnet-name.ts.net";
      description = "Optional Tailscale tailnet search domain.";
    };
  };
  config = lib.mkIf cfg.enable {
    networking = {
      nameservers = ["100.100.100.100" "8.8.8.8" "1.1.1.1"];
      search = lib.optionals (cfg.domain != null) [cfg.domain];
    };
    services.tailscale.enable = true;
  };
}
