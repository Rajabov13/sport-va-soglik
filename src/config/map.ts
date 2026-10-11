/**
 * Map tiles default to the standard, keyless OpenStreetMap tiles (CARTO basemaps now show an
 * "API key required" watermark). NEXT_PUBLIC_MAP_TILE_URL can still override it, but an override
 * whose API key is missing or a placeholder (e.g. "?key=" / "YOUR_KEY") is ignored.
 */
const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function usableOverride(url: string | undefined): string | null {
  const value = url?.trim();
  if (!value) return null;
  const key = /[?&](?:key|api_key|apikey|access_token)=([^&]*)/i.exec(value);
  if (key && (!key[1] || /your|xxx|<|%3C/i.test(key[1]))) return null;
  return value;
}

const override = usableOverride(process.env.NEXT_PUBLIC_MAP_TILE_URL);

export const mapConfig = {
  tileUrl: override ?? DEFAULT_TILE_URL,
  attribution: (override && process.env.NEXT_PUBLIC_MAP_ATTRIBUTION) || DEFAULT_ATTRIBUTION,
  maxZoom: 19,
};
