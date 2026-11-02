import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAP_STYLE_URLS, mapStyleUrl } from './map';

const SRC = join(process.cwd(), 'src');
// The application's ONE map config: its D3 moves it from `modules/doctor/config/map` to `shared/config/map` (the same
// names as the web's: `MAP_STYLE_URLS`, `mapStyleUrl`). NIT-10 (r1): the guard reads whichever of the two the
// application has, so neither repo's commit breaks it before the other's.
const APP_MAP_CONFIGS = [
	'../application/src/shared/config/map/index.ts',
	'../application/src/modules/doctor/config/map/index.ts'
].map((path) => join(process.cwd(), path));
const APP_MAP_CONFIG = APP_MAP_CONFIGS.find((path) => existsSync(path)) ?? APP_MAP_CONFIGS[0];

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === 'generated' ? [] : sourceFiles(path);
		return /\.(ts|svelte|js|css)$/.test(name) ? [path] : [];
	});
}

describe('shared/config/map', () => {
	it('U-24.4 (app = web): ONE config gives the map its look — the application’s two OpenFreeMap styles, by theme', () => {
		expect(mapStyleUrl('light')).toBe('https://tiles.openfreemap.org/styles/positron');
		expect(mapStyleUrl('dark')).toBe('https://tiles.openfreemap.org/styles/dark');
		const application = readFileSync(APP_MAP_CONFIG, 'utf8');
		for (const url of Object.values(MAP_STYLE_URLS)) expect(application).toContain(`'${url}'`);
	});

	it('U-24.4 (negative): no other file of the web names a map style or a tile server', () => {
		const elsewhere = sourceFiles(SRC)
			.filter((path) => !/\/shared\/config\/map(\.test)?\.ts$/.test(path))
			.filter((path) =>
				/openfreemap\.org|api\.mapbox\.com|maps\.googleapis\.com|tile\.openstreetmap/.test(
					readFileSync(path, 'utf8')
				)
			)
			.map((path) => relative(SRC, path));
		expect(elsewhere).toEqual([]);
	});
});
