{ pkgs
, config
, lib
, ...
}:
{
  options.ffmpeg.enable = lib.mkEnableOption "FFmpeg";
  config = lib.mkIf config.ffmpeg.enable {
    home.shellAliases = {
      ffmpeg = "${pkgs.ffmpeg}/bin/ffmpeg -hide_banner";
      ffprobe = "${pkgs.ffmpeg}/bin/ffprobe -hide_banner";
    };
    home.packages = [ pkgs.ffmpeg ];
  };
}
