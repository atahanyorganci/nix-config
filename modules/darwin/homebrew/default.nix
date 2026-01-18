{ ... }: {
  config = {
    environment.systemPath = [
      "/opt/homebrew/bin"
    ];
    homebrew = {
      enable = true;
      caskArgs.no_quarantine = true;
      onActivation = {
        cleanup = "zap";
        upgrade = true;
      };
    };
  };
}
