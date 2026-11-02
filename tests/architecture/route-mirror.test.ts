import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot, stripComments } from './source-scan';

/**
 * 🔴 U-29.3 (the owner's «3 tests-φρουροί»): every non-layout page route has its mirrored screen
 * (`project-architecture.md` «Mirrored screen contract»): `src/routes/<path>/+page.svelte` ⇔ `src/screens/<path>/`
 * (the root page ⇔ `src/screens/home`, a route group `(name)` adds no folder), with the screen's five files, and the
 * page renders THAT screen through its public API (`$screens/<path>`).
 */
const SCREEN_FILES = [
	'index.ts',
	'page/index.svelte',
	'hooks/index.ts',
	'hooks/use-screen.svelte.ts',
	'types.ts'
];

type RoutePage = { route: string; text: string };

/** The screen folder a page route mirrors into (`src/screens/...`). */
function screenOf(route: string): string {
	const segments = route
		.replace(/^src\/routes\/?/u, '')
		.replace(/\/?\+page\.svelte$/u, '')
		.split('/')
		.filter((segment) => segment && !/^\(.*\)$/u.test(segment));
	return `src/screens/${segments.length ? segments.join('/') : 'home'}`;
}

/** Every `+page.svelte` under `src/routes`, its comments blanked. */
function readRoutePages(): RoutePage[] {
	const pages: RoutePage[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory)) {
			const absolute = join(directory, entry);
			if (statSync(absolute).isDirectory()) walk(absolute);
			else if (entry === '+page.svelte') {
				pages.push({
					route: relative(projectRoot, absolute).split('\\').join('/'),
					text: stripComments(readFileSync(absolute, 'utf8'))
				});
			}
		}
	};
	walk(join(projectRoot, 'src/routes'));
	return pages.sort((a, b) => a.route.localeCompare(b.route));
}

/** What breaks the mirror: a missing screen file, or a page that does not render its own screen. */
function mirrorFindings(
	pages: RoutePage[],
	exists: (path: string) => boolean = (path) => existsSync(join(projectRoot, path))
): string[] {
	return pages.flatMap(({ route, text }) => {
		const screen = screenOf(route);
		const missing = SCREEN_FILES.filter((file) => !exists(`${screen}/${file}`)).map(
			(file) => `${route}: no ${screen}/${file}`
		);
		const alias = screen.replace(/^src\/screens\//u, '$screens/');
		const imports = [...text.matchAll(/from\s+['"](\$screens\/[^'"]+)['"]/gu)].map(
			(match) => match[1]
		);
		const own = imports.includes(alias) ? [] : [`${route}: does not render ${alias}`];
		const foreign = imports
			.filter((path) => path !== alias)
			.map((path) => `${route}: renders another screen ${path}`);
		return [...missing, ...own, ...foreign];
	});
}

describe('routes ⇔ screens mirror (U-29.3)', () => {
	it('U-29.3: every page route has its mirrored screen with the five files, and renders it through `$screens/<path>`', () => {
		const pages = readRoutePages();
		// The scan read the routes: the home, the results and the legal pages at least.
		expect(pages.map((page) => page.route)).toEqual(
			expect.arrayContaining([
				'src/routes/+page.svelte',
				'src/routes/doctors/+page.svelte',
				'src/routes/legal/[slug]/+page.svelte'
			])
		);
		expect(mirrorFindings(pages)).toEqual([]);
	});

	it('U-29.3: the mirror of a route — the root is `home`, a `[slug]` stays a folder, a `(group)` adds none', () => {
		expect(screenOf('src/routes/+page.svelte')).toBe('src/screens/home');
		expect(screenOf('src/routes/doctors/[slug]/+page.svelte')).toBe('src/screens/doctors/[slug]');
		expect(screenOf('src/routes/(account)/login/+page.svelte')).toBe('src/screens/login');
	});

	it('U-29.3 (negative): a route without its screen, a screen without `hooks/use-screen.svelte.ts`, a page drawing another screen — each is reported', () => {
		const files = new Set([
			...SCREEN_FILES.map((file) => `src/screens/help/${file}`),
			...SCREEN_FILES.filter((file) => file !== 'hooks/use-screen.svelte.ts').map(
				(file) => `src/screens/plans/${file}`
			)
		]);
		const planted: RoutePage[] = [
			{ route: 'src/routes/help/+page.svelte', text: "import HelpScreen from '$screens/help';" },
			{ route: 'src/routes/plans/+page.svelte', text: "import PlansScreen from '$screens/plans';" },
			{ route: 'src/routes/orphan/+page.svelte', text: '<h1>Orphan</h1>' },
			{
				route: 'src/routes/help/faq/+page.svelte',
				text: "import HelpScreen from '$screens/help';"
			}
		];
		expect(mirrorFindings(planted, (path) => files.has(path))).toEqual([
			'src/routes/plans/+page.svelte: no src/screens/plans/hooks/use-screen.svelte.ts',
			...SCREEN_FILES.map(
				(file) => `src/routes/orphan/+page.svelte: no src/screens/orphan/${file}`
			),
			'src/routes/orphan/+page.svelte: does not render $screens/orphan',
			...SCREEN_FILES.map(
				(file) => `src/routes/help/faq/+page.svelte: no src/screens/help/faq/${file}`
			),
			'src/routes/help/faq/+page.svelte: does not render $screens/help/faq',
			'src/routes/help/faq/+page.svelte: renders another screen $screens/help'
		]);
	});
});
