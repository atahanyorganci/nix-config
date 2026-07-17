# Fixes for the calibre-web dependency chain on current nixpkgs/Python 3.14:
# - free-proxy incorrectly lists pip-chill (freeze helper); pip-chill needs
#   pkg_resources, removed in setuptools 82.
# - calibre-web pins chardet/certifi tighter than nixpkgs ships.
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
