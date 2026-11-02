import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/** Every file that imports a VALUE of `maplibre-gl` (a type, its CSS and an `import()` are not one). */
function valueImportsOf(files: SourceFile[]): string[] {
	return files
		.filter((file) => !file.path.startsWith('src/generated/'))
		.flatMap((file) =>
			[...file.text.matchAll(/\bimport\s+(?!type\b)[^'";]*from\s*['"]maplibre-gl['"]/g)].map(
				() => file.path
			)
		);
}

// NIT-1 of the architecture audit (U-29): the bundle's rule lives with the architecture's guards, not in the map's spec.
describe('the map library stays out of the first bundle (U-24.4)', () => {
	it('U-24.4: `maplibre-gl` reaches no first bundle and no server — only types, its CSS and the `import()` of this map', () => {
		const files = readSourceFiles();
		expect(files.length).toBeGreaterThan(100);
		expect(valueImportsOf(files)).toEqual([]);
		const source = readFileSync(
			join(projectRoot, 'src/shared/ui/organisms/map-view/map-view.svelte'),
			'utf8'
		);
		expect(source).toContain("import('maplibre-gl')");
		expect(source).toContain("import 'maplibre-gl/dist/maplibre-gl.css'");
	});

	it('U-24.4 (negative): a value import of `maplibre-gl` is reported — a type, the CSS and `import()` are not', () => {
		const planted: SourceFile[] = [
			{ path: 'src/a.ts', text: stripComments("import maplibregl from 'maplibre-gl';") },
			{ path: 'src/b.ts', text: stripComments("import { Map } from 'maplibre-gl';") },
			{ path: 'src/c.ts', text: stripComments("import type { Map } from 'maplibre-gl';") },
			{ path: 'src/d.ts', text: stripComments("import 'maplibre-gl/dist/maplibre-gl.css';") },
			{ path: 'src/e.ts', text: stripComments("const lib = await import('maplibre-gl');") },
			{ path: 'src/f.ts', text: stripComments("// import maplibregl from 'maplibre-gl';") }
		];
		expect(valueImportsOf(planted)).toEqual(['src/a.ts', 'src/b.ts']);
	});
});
