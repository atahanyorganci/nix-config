/**
 * Re-exports of the cobalt internals this package uses.
 *
 * Cobalt is plain JavaScript with no declarations, and three things rule out the
 * usual ways of typing it: `allowJs` is false, so nothing is inferred from the
 * source; `api/package.json` sets `"exports": "./src/cobalt.js"`, which blocks
 * both a bare specifier and a `paths` alias; and TypeScript rejects an ambient
 * `declare module` with a relative name ("Ambient module declaration cannot
 * specify relative module name").
 *
 * What does work is a module with a declaration file beside it. Keeping the
 * untyped imports here means the rest of the package sees a typed surface, and
 * the paths relied on are listed in one place -- so an upstream layout change
 * shows up as one build failure rather than twenty.
 */

export { extract, normalizeURL } from "../../node_modules/@imput/cobalt-api/src/processing/url.js";

// The per-service request headers cobalt applies when it streams media
// itself. Re-exported rather than copied so the table cannot drift.
export { getHeaders } from "../../node_modules/@imput/cobalt-api/src/stream/shared.js";

export { default as bilibili } from "../../node_modules/@imput/cobalt-api/src/processing/services/bilibili.js";
export { default as bluesky } from "../../node_modules/@imput/cobalt-api/src/processing/services/bluesky.js";
export { default as dailymotion } from "../../node_modules/@imput/cobalt-api/src/processing/services/dailymotion.js";
export { default as facebook } from "../../node_modules/@imput/cobalt-api/src/processing/services/facebook.js";
export { default as instagram } from "../../node_modules/@imput/cobalt-api/src/processing/services/instagram.js";
export { default as loom } from "../../node_modules/@imput/cobalt-api/src/processing/services/loom.js";
export { default as newgrounds } from "../../node_modules/@imput/cobalt-api/src/processing/services/newgrounds.js";
export { default as ok } from "../../node_modules/@imput/cobalt-api/src/processing/services/ok.js";
export { default as pinterest } from "../../node_modules/@imput/cobalt-api/src/processing/services/pinterest.js";
export { default as reddit } from "../../node_modules/@imput/cobalt-api/src/processing/services/reddit.js";
export { default as rutube } from "../../node_modules/@imput/cobalt-api/src/processing/services/rutube.js";
export { default as snapchat } from "../../node_modules/@imput/cobalt-api/src/processing/services/snapchat.js";
export { default as soundcloud } from "../../node_modules/@imput/cobalt-api/src/processing/services/soundcloud.js";
export { default as streamable } from "../../node_modules/@imput/cobalt-api/src/processing/services/streamable.js";
export { default as tiktok } from "../../node_modules/@imput/cobalt-api/src/processing/services/tiktok.js";
export { default as tumblr } from "../../node_modules/@imput/cobalt-api/src/processing/services/tumblr.js";
export { default as twitch } from "../../node_modules/@imput/cobalt-api/src/processing/services/twitch.js";
export { default as twitter } from "../../node_modules/@imput/cobalt-api/src/processing/services/twitter.js";
export { default as vimeo } from "../../node_modules/@imput/cobalt-api/src/processing/services/vimeo.js";
export { default as vk } from "../../node_modules/@imput/cobalt-api/src/processing/services/vk.js";
