import * as Context from "effect/Context";
import * as Layer from "effect/Layer";

/** Printable width for 80mm thermal paper at 203 DPI. */
export const DEFAULT_PAPER_WIDTH_PX = 576;

export class PaperConfig extends Context.Service<PaperConfig, { readonly widthPx: number }>()("PaperConfig") {}

export const layer = (widthPx: number) => Layer.succeed(PaperConfig, { widthPx });
