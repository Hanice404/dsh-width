/**
 * dsh-width — Host half.
 *
 * Registers the durable `dsh-width` settings namespace (two width
 * percentages) so the browser settingsScope can read/write them. The values
 * persist in the user-settings document (`~/.dsh/settings.yaml`).
 */
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by the dsh-width plugin. */
export const SETTINGS_NAMESPACE = "dsh-width";
/** Field carrying the content display area width (percent of the center column). */
export const CONTENT_WIDTH_FIELD = "contentWidth";
/** Field carrying the input box (composer) width (percent of the center column). */
export const INPUT_WIDTH_FIELD = "inputWidth";

/** Width bounds shared by the schema and the client sliders. */
export const WIDTH_MIN = 30;
export const WIDTH_MAX = 100;
export const WIDTH_STEP = 5;
export const WIDTH_DEFAULT = 100;

/**
 * Durable dsh-width schema; also the wire envelope the browser scope
 * validates against. Keep the field keys and defaults in sync with the
 * client sliders.
 */
export const WidthSettingsSchema = z.object({
  [CONTENT_WIDTH_FIELD]: z.number().step(WIDTH_STEP).min(WIDTH_MIN).max(WIDTH_MAX).default(WIDTH_DEFAULT),
  [INPUT_WIDTH_FIELD]: z.number().step(WIDTH_STEP).min(WIDTH_MIN).max(WIDTH_MAX).default(WIDTH_DEFAULT),
});

/** Cordis plugin identity (used by the loader/composition). */
export const name = "dsh-width";
/** Node half waits for the settings service before registering the namespace. */
export const inject = ["settings"];

/**
 * Host half of the plugin: register the durable settings namespace.
 * @param ctx - Host cordis context.
 */
export function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(SETTINGS_NAMESPACE), WidthSettingsSchema);
  });
}
