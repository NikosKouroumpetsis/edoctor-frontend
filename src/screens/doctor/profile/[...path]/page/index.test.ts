import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { page } from '$app/state';
import { extractParagraphs } from '$modules/doctor/api/profile';
import {
	SAMPLE_DESCRIPTION,
	sampleMyProfileView,
	sampleProfileTextView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import Harness from './screen.harness.svelte';

/*
 * Wave 5.2 · screen 79 «Όνομα και περιγραφή» (D-W52-48, D-W52-49): the SCREEN — the dashboard's page with the public
 * page's OWN reader of a description composed in (a module never imports another), the server stubbed at `fetch`. A
 * made-up doctor only.
 */

function serve(text: unknown) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL | Request) => {
			const url = new URL(input instanceof Request ? input.url : String(input));
			const data = url.pathname.endsWith('/doctor/profile/translations/el')
				? text
				: url.pathname.endsWith('/doctor/me/profile')
					? sampleMyProfileView()
					: undefined;
			return data === undefined
				? new Response(JSON.stringify({ status: 'error', message: '', data: null }), {
						status: 404
					})
				: new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });
		})
	);
}

function open() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, data: { address: { section: 'about' } } } });
}

const settled = () =>
	waitFor(() => expect(screen.getByTestId('doctor-about')).toHaveAttribute('data-view', 'ready'));
const paragraphs = () =>
	[...screen.getByTestId('doctor-about-description').querySelectorAll('p')].map(
		(paragraph) => paragraph.textContent
	);

beforeEach(() => {
	page.url.href = 'http://localhost/doctor/profile/about';
	page.state = {};
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	page.url.href = 'http://localhost/';
});

describe('the screen of «Όνομα και περιγραφή» (wave 5.2 · screen 79)', () => {
	it('🔴 D-W52-48: the description is drawn by the public page’s OWN reader — the server’s `{ blocks }` as the same paragraphs the patients’ page draws, each plain text', async () => {
		const view = sampleProfileTextView();
		serve(view);
		open();
		await settled();
		// What the public profile's reader makes of the very same document is what the page shows.
		expect(paragraphs()).toEqual(extractParagraphs(view.description));
		expect(paragraphs()).toEqual([...SAMPLE_DESCRIPTION]);
		expect(screen.getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
		expect(screen.getByTestId('doctor-about-back')).toHaveAttribute('href', '/doctor/profile');
	});

	it('🔴 D-W52-48 · U-65.6: both dialects of the server’s rich text read as words alone — marks, links and markup inside a text are never drawn as elements', async () => {
		serve(
			sampleProfileTextView([], {
				description: {
					blocks: [
						{
							type: 'paragraph',
							children: [
								{ text: 'Πρώτη', bold: true },
								{ type: 'link', url: 'javascript:alert(1)', children: [{ text: 'παράγραφος.' }] }
							]
						},
						{ type: 'paragraph', children: [{ text: '   ' }] },
						{ type: 'paragraph', content: [{ type: 'text', text: '<b>Δεύτερη</b>' }] }
					]
				}
			})
		);
		open();
		await settled();
		expect(paragraphs()).toEqual(['Πρώτη παράγραφος.', '<b>Δεύτερη</b>']);
		expect(screen.getByTestId('doctor-about-description').querySelector('a, b, strong')).toBeNull();
	});

	it('🔴 U-207.2 · D-W52-49: the `{}` of a page nobody wrote yet is «Δεν έχει γραφτεί ακόμη.»', async () => {
		serve(sampleProfileTextView([]));
		open();
		await settled();
		expect(screen.getByTestId('doctor-about-description-none')).toHaveTextContent(
			'Δεν έχει γραφτεί ακόμη.'
		);
		expect(screen.queryByTestId('doctor-about-description')).toBeNull();
	});
});
