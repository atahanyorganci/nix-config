{ pkgs
, lib
, ...
}:
let
  aliases = {
    ffmpeg = "${pkgs.ffmpeg}/bin/ffmpeg -hide_banner";
    ffprobe = "${pkgs.ffmpeg}/bin/ffprobe -hide_banner";
  };
in
{
  options.ffmpeg = lib.mkEnableOption "FFmpeg";
  config = {
    home.shellAliases = aliases;
    home.packages = [ pkgs.ffmpeg ];
  };
}
