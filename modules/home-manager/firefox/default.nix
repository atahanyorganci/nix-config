{ pkgs, lib, config, user, inputs, ... }:
{
  options.firefox.enable = lib.mkEnableOption "Firefox";
  config = lib.mkIf config.firefox.enable {
    # This is patch for Firefox to allow downgrading to profiles.ini.
    #
    # Usefull links
    # - https://github.com/bandithedoge/nixpkgs-firefox-darwin/issues/14
    # - https://github.com/nix-community/home-manager/issues/5717
    # - https://github.com/nix-community/home-manager/pull/5801
    # - https://github.com/nix-community/home-manager/pull/5723
    home.sessionVariables = {
      MOZ_LEGACY_PROFILES = 1;
      MOZ_ALLOW_DOWNGRADE = 1;
    };
    programs.firefox = {
      enable = true;
      policies = {
        AppAutoUpdate = false;
        DisableAppUpdate = true;
        DisableFeedbackCommands = true;
        DisableFirefoxAccounts = true;
        DisableFirefoxStudies = true;
        DisablePocket = true;
        DisableTelemetry = true;
        OfferToSaveLogins = false;
      };
      profiles.${user.username} = {
        name = user.name;
        isDefault = true;
        settings = {
          "app.shield.optoutstudies.enabled" = false;
          "app.update.auto" = false;
          "browser.aboutConfig.showWarning" = false;
          "browser.newtabpage.activity-stream.asrouter.userprefs.cfr.addons" = false;
          "browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features" = false;
          "browser.newtabpage.activity-stream.discoverystream.newSponsoredLabel.enabled" = false;
          "browser.newtabpage.activity-stream.discoverystream.sponsored-collections.enabled" = false;
          "browser.newtabpage.activity-stream.showSponsored" = false;
          "browser.newtabpage.activity-stream.showSponsoredTopSites" = false;
          "browser.newtabpage.activity-stream.system.showSponsored" = false;
          "browser.search.newSearchConfig.enabled" = false;
          "browser.startup.page" = 3;
          "browser.tabs.warnOnClose" = false;
          "browser.tabs.warnOnCloseOtherTabs" = false;
          "browser.tabs.warnOnOpen" = false;
          "browser.warnOnQuit" = false;
          "browser.warnOnQuitShortcut" = false;
          "datareporting.healthreport.uploadEnabled" = false;
          "doh-rollout.disable-heuristics" = true;
          "dom.security.https_only_mode_ever_enabled" = true;
          "dom.security.https_only_mode" = true;
          "extensions.autoDisableScopes" = 0;
          "identity.fxaccounts.telemetry.clientAssociationPing.enabled" = false;
          "network.trr.mode" = 3;
          "network.trr.uri" = "https://mozilla.cloudflare-dns.com/dns-query";
          "privacy.donottrackheader.enabled" = true;
          "privacy.fingerprintingProtection" = true;
          "privacy.globalprivacycontrol.enabled" = true;
          "privacy.trackingprotection.cryptomining.enabled" = true;
          "privacy.trackingprotection.emailtracking.data_collection.enabled" = true;
          "privacy.trackingprotection.emailtracking.enabled" = true;
          "privacy.trackingprotection.emailtracking.pbmode.enabled" = true;
          "privacy.trackingprotection.enabled" = true;
          "privacy.trackingprotection.fingerprinting.enabled" = true;
          "privacy.trackingprotection.pbmode.enabled" = true;
          "privacy.trackingprotection.socialtracking.enable" = true;
          "privacy.trackingprotection.socialtracking.enabled" = true;
          "signon.management.page.breach-alerts.enabled" = false;
          "signon.rememberSignons" = false;
          "toolkit.telemetry.pioneer-new-studies-available" = false;
          "toolkit.telemetry.reportingpolicy.firstRun" = false;
          "trailhead.firstrun.didSeeAboutWelcome" = true;
        };
        search = {
          force = true;
          default = "DuckDuckGo";
          privateDefault = "DuckDuckGo";
          order = [ "DuckDuckGo" ];
          engines = {
            "DuckDuckGo" = {
              urls = [{
                template = "https://duckduckgo.com";
                params = [
                  { name = "q"; value = "{searchTerms}"; }
                ];
              }];
            };
            "Bing".metaData.hidden = true;
            "Google".metaData.hidden = true;
            "Wikipedia (en)".metaData.hidden = true;
          };
        };
        extensions = with inputs.firefox-addons.packages.${pkgs.system}; [
          bitwarden
          ublock-origin
          sponsorblock
          facebook-container
          metamask
          react-devtools
        ];
      };
    };
  };
}
