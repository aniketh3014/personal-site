import type { FontData } from "astro:assets";

export function getFontPathByWeight(
  fonts: FontData[],
  weight: number,
  options?: {
    style?: "normal" | "italic";
    format?: string;
  }
): string | undefined {
  const style = options?.style ?? "normal";

  // satori (OG images) reads TrueType and WOFF, but not WOFF2. Pick by file
  // type explicitly instead of falling back to whichever file comes first.
  const preferred = options?.format
    ? [options.format]
    : ["truetype", "ttf", "woff"];
  const matches = (file: { url: string; format?: string }, f: string) =>
    file.format === f || file.url.endsWith(f === "truetype" ? ".ttf" : `.${f}`);

  for (const font of fonts) {
    if (font.weight === String(weight) && font.style === style) {
      for (const f of preferred) {
        const src = font.src.find(file => matches(file, f));
        if (src) return src.url;
      }
    }
  }

  return undefined;
}
