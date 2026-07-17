# free-proxy incorrectly lists pip-chill (author's freeze helper) as a runtime
# dependency. pip-chill still imports pkg_resources, removed in setuptools 82,
# which breaks calibre-web on Python 3.14.
{
  flake.overlays.free-proxy = final: prev: {
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
  };
}
