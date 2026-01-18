{ ... }: {
  flake.darwinModules = {
    firefox = import ./firefox;
    homebrew = import ./homebrew;
    shell = import ./shell;
    system = import ./system;
  };
}
