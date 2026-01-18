{ lib
, ...
}:
{
  options.terminal = {
    font = {
      style = lib.mkOption {
        type = lib.types.str;
        default = "Regular";
        description = "Font style";
      };
      size = lib.mkOption {
        type = lib.types.int;
        default = 12;
        description = "Font size in points";
      };
    };
    dimensions = {
      columns = lib.mkOption {
        type = lib.types.int;
        default = 100;
        description = "Number of columns in the terminal";
      };
      lines = lib.mkOption {
        type = lib.types.int;
        default = 50;
        description = "Number of lines in the terminal";
      };
    };
    padding = {
      x = lib.mkOption {
        type = lib.types.int;
        default = 8;
        description = "Horizontal padding in pixels";
      };
      y = lib.mkOption {
        type = lib.types.int;
        default = 8;
        description = "Vertical padding in pixels";
      };
    };
    position = {
      x = lib.mkOption {
        type = lib.types.int;
        default = 32;
        description = "Horizontal position in pixels";
      };
      y = lib.mkOption {
        type = lib.types.int;
        default = 32;
        description = "Vertical position in pixels";
      };
    };
  };
}
