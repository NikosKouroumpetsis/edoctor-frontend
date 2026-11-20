import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import { page } from '$app/state';
import {
	sampleEmptyProfileView,
	sampleMyProfileView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import Harness from './screen.harness.svelte';

/*
 * Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-26, U-224): the SCREEN — the dashboard's band and read over the public
 * profile's own page, the server stubbed at `fetch`. A made-up doctor only.
 */

const DOCTOR_ID = '0199a0d0-0000-7000-8000-0000000000d1';
const doctor = {
	doctorId: DOCTOR_ID,
	slug: 'eleni-pappa-kardiologos',
	fullName: 'Ελένη Παππά',
	professional: { id: 'pro-1', name: 'Καρδιολόγος', slug: 'kardiologos' },
	images: [],
	services: [],
	description: { content: [{ content: [{ text: 'Καρδιολόγος με εμπειρία στην πρόληψη.' }] }] }
};

let reads: URL[] = [];

function serve(answers: { preview: unknown; overview: unknown }) {
	reads = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string | URL | Request) => {
			const url = new URL(input instanceof Request ? input.url : String(input));
			reads.push(url);
			const own = url.pathname.endsWith('/doctor/me/profile/preview')
				? answers.preview
				: url.pathname.endsWith('/doctor/me/profile')
					? answers.overview
					: undefined;
			// Whatever else the public page reads in the browser (times, reviews) has no answer in this spec.
			return own === undefined
				? new Response(JSON.stringify({ status: 'error', message: '', data: null }), {
						status: 404
					})
				: new Response(JSON.stringify({ status: 'success', message: '', data: own }), {
						status: 200
					});
		})
	);
}

function open() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client } });
}

const settled = (view: string) =>
	waitFor(() =>
		expect(screen.getByTestId('doctor-profile-preview')).toHaveAttribute('data-view', view)
	);

beforeEach(() => {
	page.url.href = 'http://localhost/doctor/profile/preview';
	page.state = {};
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	page.url.href = 'http://localhost/';
	document.head.innerHTML = '';
});

describe('screens/doctor/profile/preview (D-W52-26, U-224)', () => {
	it('🔴 D-W52-26: the public profile’s own page under the band, drawn with the facts of the preview’s read — for a doctor the search does not show yet too', async () => {
		serve({
			preview: { doctor, pricingVisible: true, language: 'el' },
			overview: sampleEmptyProfileView()
		});
		open();
		await settled('ready');
		const band = screen.getByTestId('doctor-profile-preview-band');
		expect(band).toHaveTextContent('Έτσι σας βλέπουν οι ασθενείς');
		expect(await screen.findByTestId('doctor-profile-preview-note')).toHaveTextContent(
			'Ακόμη δεν φαίνεστε στην αναζήτηση: αυτή τη σελίδα τη βλέπετε μόνο εσείς.'
		);
		expect(screen.getByTestId('doctor-profile-preview-close')).toHaveAttribute(
			'href',
			'/doctor/profile'
		);
		// The page is the public profile's (`doctor/ui/detail`), not a copy: its ONE h1 is the doctor's name.
		const publicPage = screen.getByTestId('doctor-detail-profile-page');
		expect(
			band.compareDocumentPosition(publicPage) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ελένη Παππά');
	});

	it('🔴 D-W52-26: no SEO — `noindex`, no canonical, no alternate, no Open Graph, no JSON-LD; no bar of the public page over the band', async () => {
		serve({
			preview: { doctor, pricingVisible: true, language: 'el' },
			overview: sampleMyProfileView()
		});
		open();
		await settled('ready');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
		expect(document.head.querySelector('link[rel="alternate"]')).toBeNull();
		expect(document.head.querySelector('meta[property^="og:"]')).toBeNull();
		expect(document.head.querySelector('script[type="application/ld+json"]')).toBeNull();
		expect(document.title).toBe('Έτσι σας βλέπουν οι ασθενείς | eDoctor');
		expect(screen.queryByTestId('doctor-detail-sticky-header')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-section-bar')).toBeNull();
	});

	it('🔴 D-W52-26α: every button and every link of the doctor’s page is only to look at — all of them inside the `inert` body, for a doctor the search shows and for one it does not; «Κλείσιμο» alone answers', async () => {
		for (const overview of [sampleMyProfileView(), sampleEmptyProfileView()]) {
			serve({ preview: { doctor, pricingVisible: true, language: 'el' }, overview });
			const view = open();
			await settled('ready');
			const body = screen.getByTestId('doctor-profile-preview-body');
			expect(body).toHaveAttribute('inert');
			expect(body).toContainElement(screen.getByTestId('doctor-detail-profile-page'));
			const controls = [
				...screen
					.getByTestId('doctor-profile-preview')
					.querySelectorAll<HTMLElement>('a[href], button, [role="button"], [tabindex], input')
			];
			const live = controls.filter((control) => control.closest('[inert]') === null);
			// The page has its controls (the booking, the sections, the links) — and none of them answers.
			expect(controls.length).toBeGreaterThan(1);
			expect(live.map((control) => control.getAttribute('data-testid'))).toEqual([
				'doctor-profile-preview-close'
			]);
			expect(screen.queryByRole('dialog')).toBeNull();
			view.unmount();
		}
	});

	it('🔴 D-W52-26 · U-224.2 (negative): nothing a patient could send is composed — no «Επικοινωνήστε», no member’s read of the public profile, and every read of the doctor’s own names nobody', async () => {
		serve({
			preview: { doctor, pricingVisible: true, language: 'el' },
			overview: sampleMyProfileView()
		});
		open();
		await settled('ready');
		await screen.findByTestId('doctor-profile-preview-note');
		expect(screen.queryByTestId('doctor-contact')).toBeNull();
		expect(screen.queryByText('Επικοινωνήστε με τον γιατρό')).toBeNull();
		const own = reads.filter((url) => url.pathname.includes('/doctor/me/'));
		expect(own.map((url) => url.pathname.replace(/^.*\/doctor\/me/u, '/doctor/me')).sort()).toEqual(
			['/doctor/me/profile', '/doctor/me/profile/preview']
		);
		for (const url of own) expect([...url.searchParams]).toEqual([['lang', 'el']]);
		// The preview's answer already carries what the doctor may see: the public profile is never read again here.
		expect(reads.filter((url) => /\/doctor\/public\/doctors\/[^/]+$/u.test(url.pathname))).toEqual(
			[]
		);
		// No write leaves the page by itself.
		const calls = vi.mocked(fetch).mock.calls as unknown as [unknown, RequestInit | undefined][];
		expect(calls.filter(([, init]) => (init?.method ?? 'GET') !== 'GET')).toEqual([]);
	});

	it('D-W52-18: `doctor: null` (no text, specialty or office yet) — what the public page shows for a doctor it cannot draw, «Ο γιατρός δεν βρέθηκε», under the same band', async () => {
		serve({
			preview: { doctor: null, pricingVisible: true, language: 'el' },
			overview: sampleMyProfileView({
				visibility: { visible: false, reason: 'INCOMPLETE', licenceEndedAt: null }
			})
		});
		open();
		await settled('missing');
		expect(screen.getByTestId('doctor-detail-error-page')).toHaveTextContent(
			'Ο γιατρός δεν βρέθηκε'
		);
		expect(screen.queryByTestId('doctor-detail-profile-page')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-sticky-header')).toBeNull();
		expect(screen.getByTestId('doctor-profile-preview-close')).toHaveAttribute(
			'href',
			'/doctor/profile'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
	});
});
