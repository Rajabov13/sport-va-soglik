/**
 * Map tiles are configurable. Without a key we fall back to the standard OpenStreetMap tiles,
 * which is suitable for demos and low traffic. For production set NEXT_PUBLIC_MAP_TILE_URL
 * (e.g. MapTiler: https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_KEY).
 */
export const mapConfig = {
  tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
};
