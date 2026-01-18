{ ... }:
{
  # This is patch for Firefox to allow downgrading to profiles.ini.
  #
  # Usefull links
  # - https://github.com/bandithedoge/nixpkgs-firefox-nix-darwin/issues/14
  # - https://github.com/nix-community/home-manager/issues/5717
  # - https://github.com/nix-community/home-manager/pull/5801
  # - https://github.com/nix-community/home-manager/pull/5723
  # - https://github.com/nix-community/home-manager/pull/5808
  launchd.user.envVariables = {
    MOZ_LEGACY_PROFILES = "1";
    MOZ_ALLOW_DOWNGRADE = "1";
  };
}
