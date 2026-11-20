import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import {
	sampleEmptyProfileView,
	sampleMyProfileView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import Harness from './preview.harness.svelte';

/*
 * Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-26): the band and the two reads with the server stubbed at `fetch`; the public
 * profile's page is the screen's (a stand-in here). A made-up doctor only.
 */

type Answer = { status: number; data?: unknown };
let reads: URL[] = [];

function serve(answers: { preview: () => Answer; overview: () => Answer }) {
	reads = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const url = new URL(String(input));
			reads.push(url);
			const { status, data } = url.pathname.endsWith('/preview')
				? answers.preview()
				: answers.overview();
			return new Response(
				JSON.stringify({ status: status === 200 ? 'success' : 'error', message: '', data }),
				{ status }
			);
		})
	);
}

const pageOf = (fullName = 'Ελένη Παππά') => ({
	status: 200,
	data: { doctor: { fullName }, pricingVisible: true, language: 'el' }
});
const shown = () => ({ status: 200, data: sampleMyProfileView() });
const hidden = () => ({ status: 200, data: sampleEmptyProfileView() });

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, ...options } });
}

const page = () => screen.getByTestId('doctor-profile-preview');
const settled = (view: string) => waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const band = () => screen.getByTestId('doctor-profile-preview-band');
const note = () => screen.findByTestId('doctor-profile-preview-note');

afterEach(() => {
	vi.unstubAllGlobals();
	document.head.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
});

describe('«Δείτε πώς σας βλέπουν» (wave 5.2 · D-W52-26)', () => {
	it('🔴 D-W52-26: ONE band over the public page — «Έτσι σας βλέπουν οι ασθενείς», «Η σελίδα σας, όπως την ανοίγει ένας ασθενής.» for a doctor the search shows, and «Κλείσιμο» back to «Το προφίλ μου»', async () => {
		serve({ preview: pageOf, overview: shown });
		open();
		await settled('ready');
		expect(band()).toHaveTextContent('Έτσι σας βλέπουν οι ασθενείς');
		expect(await note()).toHaveTextContent('Η σελίδα σας, όπως την ανοίγει ένας ασθενής.');
		const close = screen.getByTestId('doctor-profile-preview-close');
		expect(close.tagName.toLowerCase()).toBe('a');
		expect(close).toHaveAttribute('href', '/doctor/profile');
		expect(close).toHaveTextContent('Κλείσιμο');
		expect(close.className).not.toMatch(/hover:/u);
		// The band stays on top: at the screen's top below 744, under the dashboard's bar from it.
		expect(band()).toHaveClass('sticky', 'top-0', 'tablet:top-bar-top');
		// The public page under the band, with the facts the screen's reader made of the answer.
		const publicPage = screen.getByTestId('public-page');
		expect(publicPage).toHaveTextContent('Ελένη Παππά');
		expect(
			band().compareDocumentPosition(publicPage) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
		expect(Number(publicPage.getAttribute('data-read-at'))).toBeGreaterThan(0);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('🔴 D-W52-26 (U-224): before the search shows the doctor the page opens all the same — «Ακόμη δεν φαίνεστε στην αναζήτηση: αυτή τη σελίδα τη βλέπετε μόνο εσείς.»', async () => {
		serve({ preview: pageOf, overview: hidden });
		open();
		await settled('ready');
		expect(await note()).toHaveTextContent(
			'Ακόμη δεν φαίνεστε στην αναζήτηση: αυτή τη σελίδα τη βλέπετε μόνο εσείς.'
		);
		expect(screen.getByTestId('public-page')).toBeInTheDocument();
	});

	it('🔴 D-W52-26α: a licence that ended has its own line — «Δεν φαίνεστε στην αναζήτηση όσο η άδειά σας έληξε: αυτή τη σελίδα τη βλέπετε μόνο εσείς.»', async () => {
		serve({
			preview: pageOf,
			overview: () => ({
				status: 200,
				data: sampleMyProfileView({
					visibility: {
						visible: false,
						reason: 'LICENCE_EXPIRED',
						licenceEndedAt: '2026-10-31T21:59:59.999Z'
					}
				})
			})
		});
		open();
		await settled('ready');
		expect(await note()).toHaveTextContent(
			'Δεν φαίνεστε στην αναζήτηση όσο η άδειά σας έληξε: αυτή τη σελίδα τη βλέπετε μόνο εσείς.'
		);
		expect(band()).not.toHaveTextContent('Ακόμη δεν φαίνεστε');
	});

	it('🔴 D-W52-26α: what stands under the band is only to look at, for EVERY doctor — the whole body is `inert` (no press, no focus, nothing sent), «Κλείσιμο» alone stays a control, outside it', async () => {
		for (const overview of [shown, hidden]) {
			serve({ preview: pageOf, overview });
			const view = open();
			await settled('ready');
			const body = screen.getByTestId('doctor-profile-preview-body');
			expect(body).toHaveAttribute('inert');
			expect(body).toContainElement(screen.getByTestId('public-page'));
			// The band is no part of it: its one control answers.
			expect(body).not.toContainElement(band());
			expect(band().closest('[inert]')).toBeNull();
			expect(screen.getByTestId('doctor-profile-preview-close').closest('[inert]')).toBeNull();
			// The body scrolls with the page: it is no box with a scroll of its own.
			expect(body.className).not.toMatch(/overflow/u);
			view.unmount();
		}
	});

	it('🔴 D-W52-26α: «δεν βρέθηκε» of a page that cannot be drawn is under the same rule — its way out is not a control here', async () => {
		serve({ preview: () => ({ status: 200, data: { doctor: null } }), overview: hidden });
		open();
		await settled('missing');
		expect(screen.getByTestId('public-missing').closest('[inert]')).toBe(
			screen.getByTestId('doctor-profile-preview-body')
		);
	});

	it('🔴 D-W52-26: a personal page — `noindex`, no canonical, no alternate; its own title', async () => {
		serve({ preview: pageOf, overview: shown });
		open();
		await settled('ready');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
		expect(document.head.querySelector('link[rel="alternate"]')).toBeNull();
		expect(document.title).toBe('Έτσι σας βλέπουν οι ασθενείς | eDoctor');
	});

	it('🔴 U-224.2: both reads ask for the doctor of the session — no doctor, slug or office in the address, only the language', async () => {
		serve({ preview: pageOf, overview: shown });
		open({ locale: 'en' });
		await settled('ready');
		await note();
		expect(
			reads.map((url) => url.pathname.replace(/^.*\/doctor\/me/u, '/doctor/me')).sort()
		).toEqual(['/doctor/me/profile', '/doctor/me/profile/preview']);
		for (const url of reads) expect([...url.searchParams]).toEqual([['lang', 'en']]);
		expect(screen.getByTestId('doctor-profile-preview-close')).toHaveAttribute(
			'href',
			'/en/doctor/profile'
		);
		expect(band()).toHaveTextContent('This is how patients see you');
	});

	it('D-W52-18: a page that cannot be drawn (`doctor: null`, as the public profile answers a doctor it does not show) — what the public page shows then, under the same band', async () => {
		serve({
			preview: () => ({
				status: 200,
				data: { doctor: null, pricingVisible: true, language: 'el' }
			}),
			overview: hidden
		});
		open();
		await settled('missing');
		expect(screen.getByTestId('public-missing')).toBeInTheDocument();
		expect(screen.queryByTestId('public-page')).toBeNull();
		expect(screen.getByTestId('doctor-profile-preview-close')).toHaveAttribute(
			'href',
			'/doctor/profile'
		);
	});

	it('the band says nothing of the search until it is known; a failed read of the page says so with «Δοκιμάστε ξανά» — and «Κλείσιμο» is there throughout', async () => {
		const user = userEvent.setup();
		let fails = true;
		serve({
			preview: () => (fails ? { status: 500 } : pageOf()),
			overview: () => ({ status: 500 })
		});
		open();
		expect(screen.getByTestId('doctor-profile-preview-loading')).toHaveAttribute(
			'aria-busy',
			'true'
		);
		expect(screen.getByTestId('doctor-profile-preview-close')).toBeInTheDocument();
		await settled('failed');
		expect(screen.getByTestId('doctor-profile-preview-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα.'
		);
		expect(screen.queryByTestId('doctor-profile-preview-note')).toBeNull();
		expect(screen.getByTestId('doctor-profile-preview-close')).toBeInTheDocument();
		fails = false;
		await user.click(screen.getByTestId('doctor-profile-preview-retry'));
		await settled('ready');
		// The line stays unsaid: whether the search shows the doctor never answered.
		expect(screen.queryByTestId('doctor-profile-preview-note')).toBeNull();
	});

	it('🔴 U-65.6 (negative): a session the server no longer knows (`401`) ends on the page; a refusal of the licence (`403`) does not', async () => {
		for (const [status, ended] of [
			[401, true],
			[403, false]
		] as const) {
			const expire = vi.fn();
			serve({ preview: () => ({ status }), overview: () => ({ status }) });
			const view = open({
				session: new Session({
					status: () => 'member',
					member: () => ({ firstName: 'Ελένη' }),
					signOut: async () => undefined,
					expire
				})
			});
			await settled('failed');
			await waitFor(() => expect(expire, String(status)).toHaveBeenCalledTimes(ended ? 1 : 0));
			view.unmount();
		}
	});
});
