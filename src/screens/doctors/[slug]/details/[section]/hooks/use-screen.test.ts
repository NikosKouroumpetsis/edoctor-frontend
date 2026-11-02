import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { env } from '$env/dynamic/public';
import { page } from '$app/state';
import type { useDoctorDetailsScreen } from './use-screen.svelte';
import Harness from './use-screen.harness.svelte';

// SvelteKit's `resolve` during the server's render answers RELATIVE paths (`../doctors/…`): the live error of r1.
vi.mock('$app/paths', () => ({
	base: '',
	assets: '',
	resolve: (path: string) => `..${path}`,
	resolveRoute: (path: string) => path
}));

function screenAt(href: string) {
	page.url.href = href;
	let screen: ReturnType<typeof useDoctorDetailsScreen> | undefined;
	render(Harness, { props: { slug: 'dr-athena', onScreen: (value) => (screen = value) } });
	if (!screen) throw new Error('no screen');
	return screen;
}

describe('screens/doctors/[slug]/details/[section] useDoctorDetailsScreen', () => {
	afterEach(() => {
		delete env.PUBLIC_SITE_ORIGIN;
		page.url.href = 'http://localhost/';
	});

	it('MINOR-5 of r1: a window’s own address points at the PROFILE’s canonical address — absolute on the site’s public origin, never `..`', () => {
		env.PUBLIC_SITE_ORIGIN = 'https://web.example';
		const greek = screenAt('http://localhost:5173/doctors/dr-athena/details/reviews?focus=rev-1');
		expect(greek.canonicalUrl).toBe('https://web.example/doctors/dr-athena');
		expect(greek.canonicalUrl).not.toContain('..');
		const english = screenAt('http://localhost:5173/en/doctors/dr-athena/details/photos?focus=2');
		expect(english.canonicalUrl).toBe('https://web.example/en/doctors/dr-athena');
		expect(english.alternateUrls.el).toBe('https://web.example/doctors/dr-athena');
	});
});
