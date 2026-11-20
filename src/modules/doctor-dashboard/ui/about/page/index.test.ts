import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import {
	SAMPLE_DESCRIPTION,
	sampleMyProfileView,
	sampleProfileTextView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import Harness from './about.harness.svelte';

/*
 * Wave 5.2 · screen 79 «Όνομα και περιγραφή» (U-207, D-W52-47 … 49): the page with the server stubbed at `fetch` (the
 * module's precedent). A made-up doctor only.
 */

type Answer = { status: number; data?: unknown; body?: unknown };
type Call = { method: string; path: string; search: string };
let calls: Call[] = [];

const TEXT = '/doctor/profile/translations/el';
const PROFILE = '/doctor/me/profile';

/** One server for the page's two reads: its Greek text and «Το προφίλ μου» (the lock of the name). */
function serve(
	options: {
		text?: () => Answer;
		profile?: () => Answer;
	} = {}
) {
	calls = [];
	const text: () => Answer =
		options.text ?? (() => ({ status: 200, data: sampleProfileTextView() }));
	const profile: () => Answer =
		options.profile ?? (() => ({ status: 200, data: sampleMyProfileView() }));
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const path = url.pathname.replace(/^\/api\/v\d+/u, '');
			calls.push({ method: init?.method ?? 'GET', path, search: url.search });
			const { status, data, body } = path === TEXT ? text() : profile();
			return new Response(
				JSON.stringify(
					body ?? { status: status === 200 ? 'success' : 'error', message: '', data: data ?? null }
				),
				{ status }
			);
		})
	);
}

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, ...options } });
}

const page = () => screen.getByTestId('doctor-about');
const settled = (view = 'ready') =>
	waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const paragraphs = () =>
	[...screen.getByTestId('doctor-about-description').querySelectorAll('p')].map(
		(paragraph) => paragraph.textContent
	);
const textReads = () => calls.filter((call) => call.path === TEXT);
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('«Όνομα και περιγραφή» of the doctor (wave 5.2 · screen 79)', () => {
	it('🔴 U-207 · D-W52-49: the title, «Έτσι τα διαβάζουν οι ασθενείς στη σελίδα σας.», «Όνομα» with the name and the lock’s words, «Περιγραφή» with the text in its paragraphs and «Τη γράφει η ομάδα του eDoctor.» — word for word', async () => {
		serve();
		open();
		await settled();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Όνομα και περιγραφή' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-about-lead')).toHaveTextContent(
			'Έτσι τα διαβάζουν οι ασθενείς στη σελίδα σας.'
		);
		expect(
			within(page())
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim())
		).toEqual(['Όνομα', 'Περιγραφή']);
		expect(screen.getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
		const locked = screen.getByTestId('doctor-about-name-locked');
		expect(locked.textContent?.trim()).toBe(
			'Κλείδωσε όταν πήρατε την πρώτη σας άδεια στο eDoctor. Αν χρειάζεται διόρθωση, την κάνει η ομάδα του eDoctor.'
		);
		// The lock is a glyph beside the words, in the muted colour.
		expect(locked.querySelector('svg')).not.toBeNull();
		expect(locked).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(paragraphs()).toEqual([...SAMPLE_DESCRIPTION]);
		expect(screen.getByTestId('doctor-about-description')).toHaveClass(
			'text-body-lg',
			'text-foreground'
		);
		expect(screen.getByTestId('doctor-about-description-by').textContent?.trim()).toBe(
			'Τη γράφει η ομάδα του eDoctor.'
		);
		expect(screen.queryByTestId('doctor-about-description-none')).toBeNull();
	});

	it('🔴 U-207.2 · D-W52-49: without a description — `{}`, no blocks, blank blocks, or no Greek text at all (`null`) — the dashed box says «Δεν έχει γραφτεί ακόμη.», never in the strong colour, and «Τη γράφει η ομάδα του eDoctor.» stays', async () => {
		const empties: unknown[] = [
			sampleProfileTextView([]),
			sampleProfileTextView([], { description: { blocks: [] } }),
			sampleProfileTextView([], {
				description: { blocks: [{ type: 'paragraph', children: [{ text: '   ' }] }] }
			}),
			sampleProfileTextView([], { description: null }),
			sampleProfileTextView([], { description: 'Κείμενο χωρίς μορφή' }),
			null
		];
		for (const data of empties) {
			serve({ text: () => ({ status: 200, data }) });
			const view = open();
			await settled();
			const none = screen.getByTestId('doctor-about-description-none');
			expect(none.textContent?.trim()).toBe('Δεν έχει γραφτεί ακόμη.');
			expect(none).toHaveClass('border-dashed', 'text-muted-foreground');
			expect(screen.queryByTestId('doctor-about-description')).toBeNull();
			expect(screen.getByTestId('doctor-about-description-by')).toHaveTextContent(
				'Τη γράφει η ομάδα του eDoctor.'
			);
			expect(
				page().querySelector('[class*="text-accent"], [class*="text-destructive"]')
			).toBeNull();
			// The name is the one «Το προφίλ μου» reads when the page has no Greek text of its own.
			expect(screen.getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
			view.unmount();
		}
	});

	it('🔴 U-207 · D-W52-49: the page is READ ONLY — no field, no button, no «Επεξεργασία», no choice of a language (D-W52-01); its one link is «‹» to «Το προφίλ μου», drawn below 950 alone (U-102, U-217)', async () => {
		serve();
		open();
		await settled();
		expect(
			page().querySelectorAll('input, textarea, select, button, [contenteditable], [role="button"]')
		).toHaveLength(0);
		const links = within(page()).getAllByRole('link');
		expect(links).toHaveLength(1);
		expect(links[0]).toBe(screen.getByTestId('doctor-about-back'));
		expect(links[0]).toHaveAttribute('href', '/doctor/profile');
		expect(links[0]).toHaveAccessibleName('Πίσω');
		expect(links[0]).toHaveClass('split:hidden');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(page()).not.toHaveTextContent(/Επεξεργασία|Αλλαγή|Αποθήκευση|English|Αγγλικά/u);
		// It asks and never writes.
		expect(calls.every((call) => call.method === 'GET')).toBe(true);
	});

	it('🔴 D-W52-47 · D-W52-01: ONE read of the page’s own Greek text — `GET /doctor/profile/translations/el`, whatever the page’s language, naming no doctor — and the lock from «Το προφίλ μου»', async () => {
		serve();
		open({ locale: 'en' });
		await settled();
		expect(textReads()).toEqual([{ method: 'GET', path: TEXT, search: '' }]);
		expect(calls.filter((call) => call.path === PROFILE)).toEqual([
			{ method: 'GET', path: PROFILE, search: '?lang=en' }
		]);
		expect(calls).toHaveLength(2);
		expect(JSON.stringify(calls)).not.toMatch(/tenantUserId|doctorId/u);
	});

	it('🔴 D-W52-47: the lock’s words are written only once the server says `nameLocked` — never for `false`, a broken answer, or while «Το προφίλ μου» has no answer; the name and the description are read all the same', async () => {
		const about = (nameLocked: unknown) => ({
			status: 200,
			data: sampleMyProfileView({
				sections: {
					...sampleMyProfileView().sections,
					about: { fullName: 'Ελένη Παππά', hasDescription: true, nameLocked } as never
				}
			})
		});
		for (const profile of [
			() => about(false),
			() => about('true'),
			() => about(undefined),
			() => ({ status: 503 })
		]) {
			serve({ profile });
			const view = open();
			await settled();
			await waitFor(() => expect(calls.some((call) => call.path === PROFILE)).toBe(true));
			expect(screen.queryByTestId('doctor-about-name-locked')).toBeNull();
			expect(screen.getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
			expect(paragraphs()).toEqual([...SAMPLE_DESCRIPTION]);
			view.unmount();
		}
	});

	it('the wait draws no fact; a read without an answer says so with «Δοκιμάστε ξανά», which asks again', async () => {
		let status = 503;
		serve({ text: () => ({ status, data: status === 200 ? sampleProfileTextView() : undefined }) });
		open();
		expect(page()).toHaveAttribute('data-view', 'loading');
		expect(screen.getByTestId('doctor-about-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('doctor-about-name')).toBeNull();
		await settled('failed');
		expect(screen.getByTestId('doctor-about-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('doctor-about-description-none')).toBeNull();
		status = 200;
		await userEvent.setup({ delay: null }).click(screen.getByTestId('doctor-about-retry'));
		await settled();
		expect(paragraphs()).toEqual([...SAMPLE_DESCRIPTION]);
	});

	it('🔴 U-65.6 (negative): a session the server no longer knows (`401`) ends on the page, once; a refusal of the licence (`403`) or no doctor (`404`) is a failed read that is not asked again by itself', async () => {
		for (const [status, ended] of [
			[401, 1],
			[403, 0],
			[404, 0]
		] as const) {
			const expire = vi.fn();
			serve({
				text: () => ({
					status,
					body: { errorCode: `EC${status}`, errorMessage: 'Forbidden: Doctor licence is required' }
				})
			});
			const view = open({ session: member(expire) });
			await settled('failed');
			expect(expire, String(status)).toHaveBeenCalledTimes(ended);
			expect(textReads(), String(status)).toHaveLength(1);
			expect(screen.queryByTestId('doctor-about-name')).toBeNull();
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): an answer that is no text is a failed read — a list, a word, a number; the page draws none of it', async () => {
		for (const data of [[sampleProfileTextView()], 'Ελένη Παππά', 7, true]) {
			serve({ text: () => ({ status: 200, data }) });
			const view = open();
			await settled('failed');
			expect(screen.queryByTestId('doctor-about-name')).toBeNull();
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): every word of the server is a text node — markup in the name or in a paragraph draws no element; a name too long is none; nothing but the name and the paragraphs is kept', async () => {
		const planted = sampleProfileTextView(
			[
				'<img src=x onerror=alert(1)>',
				'<script>alert(2)</script>',
				'[σύνδεσμος](javascript:alert(3))'
			],
			{ fullName: '<b>Ελένη</b> <a href="javascript:alert(4)">Παππά</a>' }
		);
		serve({ text: () => ({ status: 200, data: planted }) });
		const view = open();
		await settled();
		expect(
			page().querySelector('img, script, b, a:not([data-testid="doctor-about-back"])')
		).toBeNull();
		expect(screen.getByTestId('doctor-about-name')).toHaveTextContent(
			'<b>Ελένη</b> <a href="javascript:alert(4)">Παππά</a>'
		);
		expect(paragraphs()).toEqual([
			'<img src=x onerror=alert(1)>',
			'<script>alert(2)</script>',
			'[σύνδεσμος](javascript:alert(3))'
		]);
		// The page shows the name and the description alone: no id, no slug, no date of the answer.
		for (const secret of [planted.id, planted.slug, planted.transliteration, planted.createdAt]) {
			expect(page().textContent, secret).not.toContain(secret);
		}
		view.unmount();
		serve({
			text: () => ({ status: 200, data: sampleProfileTextView([], { fullName: 'α'.repeat(500) }) }),
			profile: () => ({ status: 503 })
		});
		open();
		await settled();
		expect(screen.queryByTestId('doctor-about-name')).toBeNull();
	});

	it('🔴 U-65.6 (negative): a reader that fails on a broken document, or answers what is no list of words, leaves no description — the page still stands', async () => {
		const readers = [
			() => {
				throw new Error('broken document');
			},
			() => 'one string' as never,
			() => [7, null, { text: 'x' }, '   '] as never
		];
		for (const readDescription of readers) {
			serve();
			const client = new QueryClient({
				defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
			});
			const view = render(Harness, { props: { client, readDescription } });
			await settled();
			expect(screen.getByTestId('doctor-about-description-none')).toBeInTheDocument();
			expect(screen.getByTestId('doctor-about-name')).toHaveTextContent('Ελένη Παππά');
			view.unmount();
		}
	});

	it('🔴 U-100 · U-128: no colour under the pointer and no colour of its own — tokens alone', async () => {
		serve();
		open();
		await settled();
		for (const node of [page(), ...page().querySelectorAll('*')]) {
			const classes = node.getAttribute('class') ?? '';
			expect(classes, classes).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:(?:bg|text|border)-/u);
			expect(classes, classes).not.toMatch(/\[#|rgb\(|rgba\(/u);
		}
	});

	it('the page’s language: the page’s own words in English, the doctor’s Greek words marked as Greek for a reader (D-W52-01)', async () => {
		serve();
		open({ locale: 'en' });
		await settled();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Name and description' })
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-about-lead')).toHaveTextContent(
			'This is how patients read them on your page.'
		);
		expect(screen.getByTestId('doctor-about-name-locked')).toHaveTextContent(
			'It was locked when you received your first eDoctor licence. If it needs a correction, the eDoctor team makes it.'
		);
		expect(screen.getByTestId('doctor-about-description-by')).toHaveTextContent(
			'The eDoctor team writes it.'
		);
		expect(screen.getByTestId('doctor-about-name')).toHaveAttribute('lang', 'el');
		expect(screen.getByTestId('doctor-about-description')).toHaveAttribute('lang', 'el');
		expect(paragraphs()).toEqual([...SAMPLE_DESCRIPTION]);
		expect(screen.getByTestId('doctor-about-back')).toHaveAccessibleName('Back');
	});
});
