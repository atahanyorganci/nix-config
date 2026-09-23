{inputs, ...}: {
  flake.modules.homeManager.hunk = {
    lib,
    config,
    ...
  }: let
    cfg = config.hunk;
    stylixTarget = config.stylix.targets.hunk;

    # Hunk only accepts `#rrggbb`, and has no base16 theme of its own, so the
    # tinted diff surfaces are blended here the same way Hunk derives them for
    # its built-in themes (see `buildShikiTheme` in `packages/hunk/src/ui/themes.ts`).
    colors = config.lib.stylix.colors;
    hex = name: colors.withHashtag.${name};
    channel = name: c: lib.fromHexString colors."${name}-hex-${c}";
    toHex2 = n: lib.fixedWidthString 2 "0" (lib.toLower (lib.toHexString n));
    blend = fg: bg: ratio:
      "#"
      + lib.concatMapStrings (c: let
        front = channel fg c;
        back = channel bg c;
      in
        toHex2 (builtins.floor (back + (front - back) * ratio + 0.5))) ["r" "g" "b"];

    isLight = config.stylix.polarity == "light";
    rowTint =
      if isLight
      then 0.12
      else 0.2;
    contentTint =
      if isLight
      then 0.18
      else 0.28;
    selectedTint =
      if isLight
      then 0.18
      else 0.25;

    # Scope -> base16 slot, lifted from Stylix's `base16-stylix.tmTheme`
    # template (the one its bat/yazi targets use) so syntax highlighting
    # matches the rest of the themed tools. Comma-separated selectors are split
    # into individual keys because Hunk keys overrides by exact scope.
    syntaxScopes = {
      base03 = ["comment" "punctuation.definition.comment"];
      base05 = [
        "variable"
        "variable.parameter.function"
        "keyword.operator"
        "punctuation.definition.string"
        "punctuation.definition.variable"
        "punctuation.definition.parameters"
        "punctuation.definition.array"
        "meta.separator"
      ];
      base07 = ["meta.class"];
      base08 = [
        "entity.name.tag"
        "string.other.link"
        "punctuation.definition.string.begin.markdown"
        "punctuation.definition.string.end.markdown"
        "markup.deleted"
      ];
      base09 = [
        "constant"
        "constant.numeric"
        "entity.other.attribute-name"
        "keyword.other.unit"
        "meta.link"
        "markup.quote"
      ];
      base0A = [
        "entity.name"
        "entity.name.class"
        "entity.name.type.class"
        "support.class"
        "markup.bold"
        "punctuation.definition.bold"
      ];
      base0B = [
        "string"
        "constant.other.symbol"
        "entity.other.inherited-class"
        "markup.raw.inline"
        "markup.inserted"
      ];
      base0C = [
        "support.function"
        "constant.other.color"
        "string.regexp"
        "constant.character.escape"
      ];
      base0D = [
        "entity.name.function"
        "meta.require"
        "support.function.any-method"
        "keyword.other.special-method"
        "entity.other.attribute-name.id"
        "punctuation.definition.entity"
        "markup.heading"
        "punctuation.definition.heading"
        "entity.name.section"
      ];
      base0E = [
        "keyword"
        "storage"
        "meta.selector"
        "markup.italic"
        "punctuation.definition.italic"
        "markup.changed"
        "punctuation.section.embedded"
        "variable.interpolation"
      ];
      base0F = ["entity.name.label"];
    };

    stylixTheme = {
      label = "Stylix";
      # Only supplies syntax rules for scopes not covered below and the light/dark
      # appearance; every semantic color is overridden.
      base =
        if isLight
        then "github-light-default"
        else "github-dark-default";

      background = hex "base00";
      panel = hex "base01";
      panelAlt = hex "base02";
      border = hex "base03";
      accent = hex "base0D";
      accentMuted = blend "base0D" "base00" selectedTint;
      text = hex "base05";
      muted = hex "base04";

      contextBg = hex "base00";
      contextContentBg = hex "base00";
      addedBg = blend "base0B" "base00" rowTint;
      removedBg = blend "base08" "base00" rowTint;
      addedContentBg = blend "base0B" "base00" contentTint;
      removedContentBg = blend "base08" "base00" contentTint;
      movedAddedBg = blend "base0E" "base00" rowTint;
      movedRemovedBg = blend "base0E" "base00" rowTint;
      addedSignColor = hex "base0B";
      removedSignColor = hex "base08";

      lineNumberBg = hex "base00";
      lineNumberFg = hex "base03";
      selectedHunk = blend "base0D" "base00" selectedTint;

      badgeAdded = hex "base0B";
      badgeRemoved = hex "base08";
      badgeNeutral = hex "base04";
      fileNew = hex "base0B";
      fileDeleted = hex "base08";
      fileModified = hex "base0A";
      fileRenamed = hex "base0D";
      fileUntracked = hex "base0C";

      noteBorder = hex "base0F";
      noteBackground = hex "base01";
      noteTitleBackground = hex "base02";
      noteTitleText = hex "base05";

      syntax_scopes =
        lib.concatMapAttrs (
          slot: scopes: lib.genAttrs scopes (_: hex slot)
        )
        syntaxScopes;
    };
  in {
    imports = [inputs.hunk.homeManagerModules.default];

    options = {
      hunk.enable = lib.mkEnableOption "Hunk, a review-first terminal diff viewer";
      stylix.targets.hunk.enable = config.lib.stylix.mkEnableTarget "Hunk" true;
    };

    config = lib.mkIf cfg.enable {
      programs.hunk = {
        enable = true;
        settings = lib.mkMerge [
          {
            mode = lib.mkDefault "auto";
            line_numbers = lib.mkDefault true;
            tab_width = lib.mkDefault 2;
          }
          (lib.mkIf (config.stylix.enable && stylixTarget.enable) {
            theme = lib.mkDefault "stylix";
            themes.stylix = stylixTheme;
          })
        ];
      };
    };
  };
}
