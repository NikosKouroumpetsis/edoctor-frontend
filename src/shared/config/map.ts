import type { ResolvedTheme } from '$shared/preferences/theme';

/**
 * 🔴 U-24.4: the ONE place of the map's look (the application's `modules/doctor/config/map`, the same documents): the
 * MapLibre style the web's maps load, OpenFreeMap's «positron» in the light theme and its «dark» night counterpart
 * (free, no key, one OpenMapTiles schema, so the two differ only in colour). A Google or Mapbox look later is a change
 * of these two addresses (MapLibre takes any style document). The map draws its attribution, which stays on.
 */
export const MAP_STYLE_URLS = {
	light: 'https://tiles.openfreemap.org/styles/positron',
	dark: 'https://tiles.openfreemap.org/styles/dark'
} as const satisfies Record<ResolvedTheme, string>;

/** The style that matches the reader's theme (the application's `doctorMapStyleUrl`). */
export function mapStyleUrl(theme: ResolvedTheme): string {
	return MAP_STYLE_URLS[theme];
}
