# Fixes for the calibre-web dependency chain on current nixpkgs/Python 3.14:
# - free-proxy incorrectly lists pip-chill (freeze helper); pip-chill needs
#   pkg_resources, removed in setuptools 82.
# - calibre-web pins chardet/certifi tighter than nixpkgs ships.
# - python-ldap's test_simple_bind_fileno_invalid expects SERVER_DOWN when
#   binding over a /dev/null fd, but on Darwin result4 returns SUCCESS.
{
  flake.overlays.free-proxy = _final: prev: {
    pythonPackagesExtensions =
      prev.pythonPackagesExtensions
      ++ [
        (
          pyFinal: pyPrev: {
            free-proxy = pyPrev.free-proxy.overridePythonAttrs (_old: {
              dependencies = with pyFinal; [
                lxml
                requests
              ];
            });

            python-ldap = pyPrev.python-ldap.overridePythonAttrs (old: {
              disabledTests =
                (old.disabledTests or [])
                ++ prev.lib.optionals prev.stdenv.hostPlatform.isDarwin [
                  "test_simple_bind_fileno_invalid"
                ];
            });
          }
        )
      ];

    calibre-web = prev.calibre-web.overridePythonAttrs (old: {
      pythonRelaxDeps =
        (old.pythonRelaxDeps or [])
        ++ [
          "chardet"
          "certifi"
        ];
    });
  };
}
