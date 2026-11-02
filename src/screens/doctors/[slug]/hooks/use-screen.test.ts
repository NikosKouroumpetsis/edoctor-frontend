import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { env } from '$env/dynamic/public';
import { page } from '$app/state';
import type { useDoctorProfileScreen } from './use-screen.svelte';
import Harness from './use-screen.harness.svelte';

const { resolved } = vi.hoisted(() => ({ resolved: vi.fn() }));
// SvelteKit's `resolve` during the server's render answers RELATIVE paths (`../doctors/…`): the live error of r1.
vi.mock('$app/paths', () => ({
	base: '',
	assets: '',
	resolve: (path: string) => `..${path}`,
	resolveRoute: (path: string) => path
}));
vi.mock('$modules/search-doctors/api/marketplace', async (importOriginal) => ({
	...(await importOriginal<typeof import('$modules/search-doctors/api/marketplace')>()),
	resolveSimilarDoctorsArea: resolved
}));

function screenAt(href: string) {
	page.url.href = href;
	let screen: ReturnType<typeof useDoctorProfileScreen> | undefined;
	render(Harness, { props: { slug: 'dr-athena', onScreen: (value) => (screen = value) } });
	if (!screen) throw new Error('no screen');
	return screen;
}

describe('screens/doctors/[slug] useDoctorProfileScreen', () => {
	afterEach(() => {
		delete env.PUBLIC_SITE_ORIGIN;
		page.url.href = 'http://localhost/';
	});

	it('MINOR-5 of r1: the canonical address is absolute on the site’s public origin — never `..`, never the request’s host — in both languages', () => {
		env.PUBLIC_SITE_ORIGIN = 'https://web.example';
		const greek = screenAt('http://localhost:5173/doctors/dr-athena');
		expect(greek.canonicalUrl).toBe('https://web.example/doctors/dr-athena');
		expect(greek.canonicalUrl).not.toContain('..');
		expect(greek.alternateUrls).toEqual({
			el: 'https://web.example/doctors/dr-athena',
			en: 'https://web.example/en/doctors/dr-athena'
		});
		const english = screenAt('http://localhost:5173/en/doctors/dr-athena');
		expect(english.canonicalUrl).toBe('https://web.example/en/doctors/dr-athena');
	});

	it('MINOR-5 of r1: without the setting the canonical address is the platform’s site, still absolute', () => {
		const screen = screenAt('http://evil.example/doctors/dr-athena');
		expect(screen.canonicalUrl).toBe('https://edoctor.gr/doctors/dr-athena');
	});

	it('U-37.2 — MAJOR-2 of r1: «Δείτε παρόμοιους» is the same specialty in the catalogue’s area by its slug; without one, no area at all', () => {
		const screen = screenAt('http://localhost/doctors/dr-athena');
		const search = {
			city: 'Πειραιάς',
			professionalId: 'pro-1',
			professionalName: 'Παθολόγος',
			professionalSlug: 'pathologos'
		};
		const located = new URL(
			screen.similarHref(search, {
				label: 'Πειραιάς',
				slug: 'dimos-peiraia',
				locationType: 'municipality'
			}),
			'https://edoctor.test/x/'
		).searchParams;
		expect(located.get('whereKind')).toBe('location');
		expect(located.get('whereSlug')).toBe('dimos-peiraia');
		expect(located.get('whereLabel')).toBe('Πειραιάς');
		expect(located.get('whatId')).toBe('pro-1');
		const unlocated = new URL(screen.similarHref(search, null), 'https://edoctor.test/x/')
			.searchParams;
		expect(
			['where', 'whereKind', 'whereSlug', 'whereLabel'].some((key) => unlocated.has(key))
		).toBe(false);
	});

	it('U-37.2 — MAJOR-2 of r1: the area is the search module’s `resolveSimilarDoctorsArea` of the city, in the page’s language', async () => {
		resolved.mockResolvedValue({ label: 'Piraeus', slug: 'dimos-peiraia' });
		const screen = screenAt('http://localhost/en/doctors/dr-athena');
		const read = screen.similarAreaQuery('Πειραιάς');
		expect(read.queryKey).toEqual(['doctor-similar-area', 'Πειραιάς', 'en']);
		await expect(read.queryFn()).resolves.toEqual({ label: 'Piraeus', slug: 'dimos-peiraia' });
		expect(resolved).toHaveBeenCalledWith(expect.anything(), 'Πειραιάς', { lang: 'en' });
	});

	it('NIT-7 of r1: the details screen composes EXACTLY the same (a screen never imports another) — the two hooks differ only in their name and their note', () => {
		const strip = (relative: string) =>
			readFileSync(join(process.cwd(), relative), 'utf8')
				.replace(
					/\/\*\*[\s\S]*?\*\/\nexport function useDoctor\w+Screen/u,
					'export function useScreen'
				)
				.trim();
		expect(strip('src/screens/doctors/[slug]/details/[section]/hooks/use-screen.svelte.ts')).toBe(
			strip('src/screens/doctors/[slug]/hooks/use-screen.svelte.ts')
		);
	});
});
