{
  perSystem = {pkgs, ...}: {
    treefmt = {
      projectRootFile = "flake.nix";
      programs = {
        deadnix.enable = true;
        mdsh.enable = true;
        alejandra.enable = true;
        shellcheck.enable = pkgs.hostPlatform.system != "riscv64-linux";
        shfmt = {
          enable = pkgs.hostPlatform.system != "riscv64-linux";
          indent_size = 4;
        };
      };
      settings.formatter = {
        shellcheck.options = ["--exclude=SC2154" "--exclude=SC2148"];
        shfmt.options = [
          "--case-indent"
          "--space-redirects"
          "--keep-padding"
          "--language-dialect"
          "bash"
        ];
      };
    };
  };
}
