import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { goto } from '$app/navigation';
import { resetServerClock } from '$shared/lib/server-clock';
import type { AppointmentFacts } from '$modules/appointments/api/appointment';
import { appointmentFactsSample } from '$modules/appointments/api/appointment/appointment.sample';
import type { AppointmentsTab } from '$modules/appointments/lib/paths';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentsList } from '../hooks/use-list.svelte';
import Harness from './list.harness.svelte';

/*
 * Screen 50 (record §6, U-134, U-139.1, P-W4 §4.1): the list's page with its list handed over (the hook's shape), the
 * server's «now» Tuesday 10 November 21:00 in Athens. Made-up people and offices.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const A1 = appointmentFactsSample.id;
const A2 = '0193a1b2-0000-7000-8000-0000000000a2';
const A3 = '0193a1b2-0000-7000-8000-0000000000a3';
const H1 = '0193a1b2-0000-7000-8000-0000000000b1';
const H2 = '0193a1b2-0000-7000-8000-0000000000b2';
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';

const visit = (extra: Partial<AppointmentFacts> = {}): AppointmentFacts => ({
	...appointmentFactsSample,
	...extra
});

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [{ url: '/maria.jpg', thumbUrl: '/maria-thumb.jpg', alt: 'Μαρία' }],
	rating: 4.9,
	reviewCount: 22
};

const links: AppointmentsLinks = {
	list: (tab) => (tab === 'history' ? '/appointments?tab=history' : '/appointments'),
	appointment: (id) => `/appointments/${id}`,
	step: (id, step) => `/appointments/${id}/${step}`,
	rating: (id) => `/ratings/${id}`,
	doctor: (slug) => `/doctors/${slug}`,
	search: '/',
	help: '/help'
};

function listOf(rows: AppointmentFacts[], extra: Partial<AppointmentsList> = {}): AppointmentsList {
	return {
		rows,
		doctorIds: [...new Set(rows.map((row) => row.doctorId))],
		loading: false,
		loaded: true,
		failed: false,
		hasMore: false,
		loadMore: vi.fn(),
		retry: vi.fn(),
		...extra
	};
}

type Props = {
	tab?: AppointmentsTab;
	list?: AppointmentsList;
	viewer?: AppointmentsViewer;
	offline?: boolean;
	openId?: string | null;
	open?: boolean;
	autoOpen?: boolean;
	paneEmpty?: boolean;
	doctorOf?: (id: string) => AppointmentDoctorFacts | null | undefined;
	onSignIn?: () => void;
	onRetry?: () => void;
};

function draw(props: Props = {}) {
	return render(Harness, {
		props: {
			locale: 'el',
			tab: 'upcoming',
			list: listOf([visit()]),
			viewer: 'member',
			offline: false,
			openId: null,
			paneKey: null,
			doctorOf: () => maria,
			links,
			onSignIn: vi.fn(),
			onRetry: vi.fn(),
			...props
		}
	});
}

const wideScreen = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);

const split = () => screen.getByTestId('appointments-split');
const listColumn = () => split().querySelector('[data-slot="split-view-list"]') as HTMLElement;
const paneColumn = () => split().querySelector('[data-slot="split-view-pane"]') as HTMLElement;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	wideScreen(false);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('screen 50 · «Τα ραντεβού μου» (record §6.1, U-134)', () => {
	it('U-134.3 · U-134.4: «Επόμενο ραντεβού · σε 2 ημέρες» over the first, «Αργότερα» over the rest; a card reads the day and the time first, then the doctor and the visit', () => {
		draw({
			list: listOf([
				visit(),
				visit({ id: A2, status: 'pending', startTime: '2026-11-16T07:00:00.000Z' }),
				visit({ id: A3, startTime: '2026-11-24T15:30:00.000Z' })
			])
		});
		const headings = screen
			.getAllByTestId('appointments-group')
			.map((node) => node.textContent?.trim());
		expect(headings).toEqual(['Επόμενο ραντεβού · σε 2 ημέρες', 'Αργότερα']);
		const cards = screen.getAllByTestId('appointment-card');
		expect(cards).toHaveLength(3);
		const first = within(cards[0]);
		expect(first.getByText('Επιβεβαιωμένο')).toHaveAttribute('data-tone', 'success');
		expect(first.getByText('Πέμπτη 12 Νοεμβρίου')).toBeInTheDocument();
		expect(first.getByText('12:30')).toBeInTheDocument();
		expect(first.getByText('Dr. Μαρία Τριανταφύλλου')).toBeInTheDocument();
		expect(first.getByText('Δερματολόγος · Απλή επίσκεψη')).toBeInTheDocument();
		expect(first.getByText('Ερμού 101, Αθήνα')).toBeInTheDocument();
		expect(first.getByTestId('appointment-card-link')).toHaveAttribute(
			'href',
			`/appointments/${A1}`
		);
		expect(within(cards[1]).getByText('Σε αναμονή')).toHaveAttribute('data-tone', 'warning');
		// The time stands on its own line below 744 and joins the day with « · » from 744 (never a dot left hanging).
		const dot = [...cards[0].querySelectorAll('span')].find((node) => node.textContent === ' · ');
		expect(dot).toHaveClass('hidden', 'tablet:inline');
		expect(dot?.parentElement).toHaveClass('flex-col', 'tablet:block');
	});

	it('D-W4-29 (negative): until the doctor’s profile answers the card leaves the doctor out — never an id; the photo is the profile’s', () => {
		const view = draw({ doctorOf: () => undefined });
		const card = screen.getByTestId('appointment-card');
		expect(card).not.toHaveTextContent('Dr.');
		expect(card).not.toHaveTextContent('doc-maria');
		expect(card.querySelector('img')).toBeNull();
		view.unmount();
		draw();
		expect(screen.getByTestId('appointment-card').querySelector('img')).toHaveAttribute(
			'src',
			'/maria-thumb.jpg'
		);
	});

	it('🔴 D-W4-68: a card’s photo that does not load gives way to the shared silhouette — never a broken image', async () => {
		draw();
		const card = screen.getByTestId('appointment-card');
		const photo = card.querySelector('[data-slot="avatar"]') as HTMLElement;
		expect(photo).toHaveClass('size-avatar-xl', 'rounded-sm');
		const image = photo.querySelector('img') as HTMLImageElement;
		expect(image).toHaveAttribute('alt', '');
		await fireEvent.error(image);
		expect(card.querySelector('img')).toBeNull();
		expect(photo.querySelector('[data-slot="media-placeholder"]')).toBeInTheDocument();
	});

	it('🔴 U-139.5 · P-B4 §13.3.4: «Για: Γιώργος Παππάς (γιος)» only for a relative; «Γράψτε κριτική για την επίσκεψη» only with an open invitation, its own link to the form', () => {
		draw({
			tab: 'history',
			list: listOf([
				visit({
					id: H1,
					status: 'completed',
					startTime: '2026-10-22T07:00:00.000Z',
					snapshot: {
						...appointmentFactsSample.snapshot,
						visitor: { kind: 'relative', name: 'Γιώργος Παππάς' }
					},
					relative: {
						relativeId: 'r1',
						firstName: 'Γιώργος',
						lastName: 'Παππάς',
						relationship: 'CHILD',
						gender: 'MALE'
					},
					ratingInvitation: { invitationId: INVITATION, expiresAt: '2026-12-21T08:00:00.000Z' }
				}),
				visit({ id: H2, status: 'canceled', startTime: '2026-09-14T15:00:00.000Z' })
			])
		});
		const [rated, canceled] = screen.getAllByTestId('appointment-card');
		expect(within(rated).getByText('Για: Γιώργος Παππάς (γιος)')).toBeInTheDocument();
		const rate = within(rated).getByTestId('appointment-card-rate');
		expect(rate).toHaveTextContent('Γράψτε κριτική για την επίσκεψη');
		expect(rate).toHaveAttribute('href', `/ratings/${INVITATION}`);
		expect(rate).toHaveClass('min-h-touch', 'relative', 'z-10');
		// Its own link, never inside the card's: no link within a link.
		expect(rate.closest('[data-testid="appointment-card-link"]')).toBeNull();
		expect(within(canceled).queryByTestId('appointment-card-rate')).toBeNull();
		expect(within(canceled).queryByText(/^Για:/u)).toBeNull();
		expect(within(canceled).getByText('Ακυρώθηκε')).toHaveAttribute('data-tone', 'muted');
	});

	it('U-134.5: «Ιστορικό» by the month of the office’s calendar («Οκτώβριος 2026»), a closed visit in 500', () => {
		draw({
			tab: 'history',
			list: listOf([
				visit({ id: H1, status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }),
				visit({ id: H2, status: 'no_show', startTime: '2026-09-14T15:00:00.000Z' })
			])
		});
		expect(
			screen.getAllByTestId('appointments-group').map((node) => node.textContent?.trim())
		).toEqual(['Οκτώβριος 2026', 'Σεπτέμβριος 2026']);
		expect(screen.getByText('Πέμπτη 22 Οκτωβρίου').parentElement).toHaveClass('font-medium');
	});

	it('🔴 Σ2 (live check w4-live-web): a card never widens the page at 320 — the cards’ column gives way to its box, the day wraps below 744 and stays whole from it, the time never breaks', () => {
		draw({ list: listOf([visit(), visit({ id: A2, startTime: '2026-11-20T10:00:00.000Z' })]) });
		for (const card of screen.getAllByTestId('appointment-card')) {
			// The cards' one column is the box's width, never its longest word's (`auto` grew to «Παρασκευή 20 Νοεμβρίου»).
			expect(card.parentElement?.tagName).toBe('UL');
			expect(card.parentElement).toHaveClass('grid', 'grid-cols-1');
			const link = within(card).getByTestId('appointment-card-link');
			expect(link.parentElement).toHaveClass('min-w-0', 'flex-1');
			const [day, dot, time] = [...(link.querySelector('.flex-col')?.children ?? [])];
			expect(day.textContent).toMatch(/Νοεμβρίου$/u);
			expect(day).toHaveClass('tablet:whitespace-nowrap');
			expect(day).not.toHaveClass('whitespace-nowrap');
			expect(dot).toHaveClass('hidden', 'tablet:inline');
			expect(time).toHaveClass('whitespace-nowrap');
		}
	});

	it('🔴 D-W4-66 · D-W4-28 (`appt.css:73`): the two capsules in the prototype’s measure — 36 high, 14 words — each still a 48 target', () => {
		draw();
		for (const value of ['upcoming', 'history']) {
			const chip = screen.getByTestId(`appointments-tab-${value}`);
			expect(chip).toHaveClass('min-h-touch', 'min-w-touch');
			const pill = chip.querySelector('[data-slot="chip-pill"]');
			expect(pill).toHaveClass('min-h-chip-tab', 'px-4');
			expect(pill).not.toHaveClass('min-h-control-sm');
			expect(pill?.querySelector('span')).toHaveClass('text-body-sm', 'font-medium');
		}
	});

	it('🔴 D-W4-28: «Επερχόμενα / Ιστορικό» are links that keep the tab in the address; the chosen one filled dark, never a colour under the pointer (U-100)', () => {
		draw();
		const upcoming = screen.getByTestId('appointments-tab-upcoming');
		const history = screen.getByTestId('appointments-tab-history');
		expect(upcoming).toHaveAttribute('href', '/appointments');
		expect(upcoming).toHaveAttribute('aria-current', 'page');
		expect(history).toHaveAttribute('href', '/appointments?tab=history');
		expect(history).not.toHaveAttribute('aria-current');
		expect(upcoming.querySelector('[data-slot="chip-pill"]')).toHaveClass('bg-foreground');
		expect(screen.getByTestId('appointments-list').innerHTML).not.toMatch(/hover:/u);
		expect(screen.getByRole('heading', { level: 1, name: 'Τα ραντεβού μου' })).toBeInTheDocument();
	});

	it('U-139.1 · Π-guest: «Ραντεβού», «Δεν υπάρχουν ραντεβού ακόμα», the prototype’s sentence (D-W4-14) and «Σύνδεση» over the page; no tabs', async () => {
		const onSignIn = vi.fn();
		draw({ viewer: 'guest', list: listOf([], { loaded: false }), onSignIn });
		expect(screen.getByRole('heading', { level: 1, name: 'Ραντεβού' })).toBeInTheDocument();
		const guest = screen.getByTestId('appointments-guest');
		expect(guest).toHaveTextContent('Δεν υπάρχουν ραντεβού ακόμα');
		expect(guest).toHaveTextContent(
			'Συνδεθείτε για να βλέπετε τα ραντεβού σας, να αλλάζετε την ώρα και να τα ακυρώνετε.'
		);
		expect(screen.queryByTestId('appointments-tab-upcoming')).toBeNull();
		await userEvent
			.setup({ delay: null })
			.click(within(guest).getByRole('button', { name: 'Σύνδεση' }));
		expect(onSignIn).toHaveBeenCalledOnce();
	});

	it('the wait, the failure (and no network) with «Δοκιμάστε ξανά», an empty «Επερχόμενα» with «Αναζήτηση γιατρών», an empty «Ιστορικό» with none', async () => {
		const waiting = draw({ viewer: 'waiting', list: listOf([], { loaded: false }) });
		expect(screen.getByTestId('appointments-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByTestId('appointments-loading').children).toHaveLength(3);
		waiting.unmount();

		const onRetry = vi.fn();
		const failed = draw({ list: listOf([], { loaded: false, failed: true }), onRetry });
		const error = screen.getByTestId('appointments-error');
		expect(error).toHaveTextContent('Δεν ήταν δυνατή η φόρτωση των ραντεβού');
		await userEvent
			.setup({ delay: null })
			.click(within(error).getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(onRetry).toHaveBeenCalledOnce();
		failed.unmount();

		const offline = draw({ offline: true, list: listOf([], { loaded: false, loading: true }) });
		expect(screen.getByTestId('appointments-error')).toBeInTheDocument();
		offline.unmount();

		const empty = draw({ list: listOf([]) });
		const upcoming = screen.getByTestId('appointments-empty');
		expect(upcoming).toHaveTextContent('Δεν έχετε επερχόμενα ραντεβού');
		expect(within(upcoming).getByRole('link', { name: 'Αναζήτηση γιατρών' })).toHaveAttribute(
			'href',
			'/'
		);
		empty.unmount();

		draw({ tab: 'history', list: listOf([]) });
		const history = screen.getByTestId('appointments-empty');
		expect(history).toHaveTextContent('Δεν υπάρχει ιστορικό ακόμα');
		expect(within(history).queryByRole('link')).toBeNull();
		expect(within(history).queryByRole('button')).toBeNull();
	});

	it('🔴 D-W4-62: the action of the guest’s, the failed and the empty list is the DARK button of the approved prototype (`contrast`), never the outline', async () => {
		const guest = draw({ viewer: 'guest' });
		const signIn = within(screen.getByTestId('appointments-guest')).getByRole('button', {
			name: 'Σύνδεση'
		});
		expect(signIn).toHaveAttribute('data-tone', 'contrast');
		expect(signIn).toHaveClass('bg-secondary');
		guest.unmount();
		const failed = draw({ list: listOf([], { failed: true }) });
		expect(
			within(screen.getByTestId('appointments-error')).getByRole('button', {
				name: 'Δοκιμάστε ξανά'
			})
		).toHaveAttribute('data-tone', 'contrast');
		failed.unmount();
		draw({ list: listOf([]) });
		expect(
			within(screen.getByTestId('appointments-empty')).getByRole('link', {
				name: 'Αναζήτηση γιατρών'
			})
		).toHaveAttribute('data-tone', 'contrast');
	});

	it('🔴 U-139.1: from 950 ONE column in the middle while nothing stands on the right — a guest, the wait, a failure, an empty tab, the list alone', () => {
		const cases: Props[] = [
			{ viewer: 'guest', list: listOf([], { loaded: false }) },
			{ viewer: 'waiting', list: listOf([], { loaded: false }) },
			{ viewer: 'failed', list: listOf([], { loaded: false }) },
			{ list: listOf([], { loaded: false, loading: true }) },
			{ list: listOf([], { loaded: false, failed: true }) },
			{ list: listOf([]) },
			{ list: listOf([visit()]) },
			{ viewer: 'guest', openId: A1 },
			{ viewer: 'failed', openId: A1 }
		];
		for (const props of cases) {
			const view = draw(props);
			expect(split(), JSON.stringify(props.viewer ?? props.openId ?? '')).toHaveAttribute(
				'data-solo'
			);
			expect(split()).not.toHaveClass('split:grid');
			const centred = props.openId ? paneColumn() : listColumn();
			expect(centred).toHaveClass('split:mx-auto', 'split:max-w-split-solo');
			view.unmount();
		}
	});

	it('🔴 U-139.1 from 950 (review w4-w4 R1 MINOR-1, MINOR-2): ONE column for the list alone with nothing to open, and for an appointment still read or failed beside a list with nothing to show either', () => {
		wideScreen(true);
		const loading = listOf([], { loaded: false, loading: true });
		const failed = listOf([], { loaded: false, failed: true });
		const cases: Props[] = [
			{ viewer: 'guest', list: listOf([], { loaded: false }) },
			{ viewer: 'waiting', list: listOf([], { loaded: false }) },
			{ viewer: 'failed', list: listOf([], { loaded: false }) },
			{ list: loading },
			{ list: failed },
			{ list: listOf([]) },
			{ openId: A1, paneEmpty: true, list: loading },
			{ openId: A1, paneEmpty: true, list: failed },
			{ openId: A1, paneEmpty: true, list: listOf([]) },
			{ openId: A1, paneEmpty: true, list: loading, offline: true }
		];
		for (const props of cases) {
			const view = draw(props);
			expect(split(), JSON.stringify(props)).toHaveAttribute('data-solo');
			const centred = props.openId ? paneColumn() : listColumn();
			expect(centred).toHaveClass('split:mx-auto', 'split:max-w-split-solo');
			view.unmount();
		}
		expect(goto).not.toHaveBeenCalled();
	});

	it('(negative) U-139.1 from 950: two columns while either side has something — 🔴 the cold open of an appointment’s address (the shot `w-loading-1440`: two waits, the session or the appointment still read, NEVER one column), the list’s cards beside an appointment read or not found (MAJOR-1)', () => {
		wideScreen(true);
		const waiting = listOf([], { loaded: false, loading: true });
		const cases: Props[] = [
			{ viewer: 'waiting', openId: A1, list: listOf([], { loaded: false }) },
			{ openId: A1, paneEmpty: false, list: waiting },
			{ openId: A1, paneEmpty: true, list: listOf([visit()]) },
			{ openId: A1, paneEmpty: false, list: listOf([visit()]) }
		];
		for (const props of cases) {
			const view = draw(props);
			expect(split(), JSON.stringify(props)).not.toHaveAttribute('data-solo');
			expect(split()).toHaveClass('split:grid');
			view.unmount();
		}
	});

	it('review w4-w4 R1 MINOR-1: from 950 the list’s first opens in the same paint as the cards — two columns and the wait on the right at once, never the list in the middle first', () => {
		wideScreen(true);
		draw({ list: listOf([visit(), visit({ id: A2 })]) });
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveClass('split:grid');
		expect(paneColumn()).toHaveClass('split:block');
		expect(screen.getByTestId('pane-content')).toHaveAttribute('data-opening');
		expect(screen.getAllByTestId('appointment-card')).toHaveLength(2);
		expect(goto).toHaveBeenCalledOnce();
	});

	it('(negative) MINOR-1: below 950 the list is the page — nothing about to open on a right column', () => {
		draw({ list: listOf([visit(), visit({ id: A2 })]) });
		expect(split()).toHaveAttribute('data-solo');
		expect(screen.getByTestId('pane-content')).not.toHaveAttribute('data-opening');
	});

	it('review w4-w4 R1 MINOR-3 (P-W4 §3.6): from 950 a card opens beside the list without moving the page or its focus; below 950 its own page, the usual way', () => {
		wideScreen(true);
		const wide = draw({ openId: A1, list: listOf([visit(), visit({ id: A2 })]) });
		for (const link of screen.getAllByTestId('appointment-card-link')) {
			expect(link).toHaveAttribute('data-sveltekit-noscroll', '');
			expect(link).toHaveAttribute('data-sveltekit-keepfocus', '');
		}
		wide.unmount();

		wideScreen(false);
		draw({ openId: A1, list: listOf([visit(), visit({ id: A2 })]) });
		for (const link of screen.getAllByTestId('appointment-card-link')) {
			expect(link).not.toHaveAttribute('data-sveltekit-noscroll');
			expect(link).not.toHaveAttribute('data-sveltekit-keepfocus');
		}
	});

	it('U-134.2: an appointment a member opened stands beside the list from 950 (420, 460 from 1128), its card dark-bordered and current; below 950 it covers the list', () => {
		draw({ openId: A1 });
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveClass('split:grid', 'split:grid-split', 'split:h-split');
		expect(listColumn()).toHaveClass('hidden', 'split:block');
		expect(paneColumn()).not.toHaveClass('hidden');
		expect(screen.getByTestId('pane-content')).toBeInTheDocument();
		const card = screen.getByTestId('appointment-card');
		expect(card).toHaveAttribute('data-selected');
		expect(card).toHaveClass('split:border-foreground', 'split:ring-1', 'split:bg-background');
		expect(screen.getByTestId('appointment-card-link')).toHaveAttribute('aria-current', 'page');
	});

	it('P-W4 §3.2: from 950 the first appointment opens beside the list in place of the list’s address; never below 950, never over one already open', () => {
		const below = draw({ list: listOf([visit(), visit({ id: A2 })]) });
		expect(goto).not.toHaveBeenCalled();
		below.unmount();

		wideScreen(true);
		const open = draw({ openId: A2, list: listOf([visit(), visit({ id: A2 })]) });
		expect(goto).not.toHaveBeenCalled();
		open.unmount();

		draw({ list: listOf([visit(), visit({ id: A2 })]) });
		expect(goto).toHaveBeenCalledWith(`/appointments/${A1}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	});

	it('screen 54 (`/ratings/<id>`, card w4-w6): a page whose right column is its own — two columns before its visit is known, the visit selected once it is, and the list NEVER opens another appointment there', () => {
		wideScreen(true);
		const before = draw({
			open: true,
			autoOpen: false,
			list: listOf([visit(), visit({ id: A2 })])
		});
		expect(split()).not.toHaveAttribute('data-solo');
		expect(paneColumn()).not.toHaveClass('hidden');
		expect(screen.getByTestId('pane-content')).toBeInTheDocument();
		expect(goto).not.toHaveBeenCalled();
		before.unmount();
		draw({ open: true, autoOpen: false, openId: A2, list: listOf([visit(), visit({ id: A2 })]) });
		const cards = screen.getAllByTestId('appointment-card');
		expect(cards[1]).toHaveAttribute('data-selected');
		expect(cards[0]).not.toHaveAttribute('data-selected');
		expect(goto).not.toHaveBeenCalled();
	});

	it('U-139.1 (negative) for screen 54: a guest, or nothing on the right beside a list with nothing either (a refusal, a failure) — ONE column, the form’s own words in the middle', () => {
		wideScreen(true);
		for (const props of [
			{ viewer: 'guest', list: listOf([], { loaded: false }) },
			{ paneEmpty: true, list: listOf([], { loaded: false, loading: true }) },
			{ paneEmpty: true, list: listOf([], { loaded: false, failed: true }) }
		] as Props[]) {
			const view = draw({ open: true, autoOpen: false, ...props });
			expect(split()).toHaveAttribute('data-solo');
			expect(paneColumn()).toHaveClass('split:mx-auto', 'split:max-w-split-solo');
			view.unmount();
		}
	});

	it('(negative) an empty tab or a guest opens nothing by itself, even from 950', () => {
		wideScreen(true);
		draw({ list: listOf([]) });
		draw({ viewer: 'guest', list: listOf([], { loaded: false }) });
		expect(goto).not.toHaveBeenCalled();
	});

	it('🔴 U-132.1 · U-100: no map and no colour or shadow under the pointer on the list', () => {
		draw({ list: listOf([visit(), visit({ id: A2 })]) });
		const html = screen.getByTestId('appointments-split').innerHTML;
		expect(html).not.toMatch(/map|maplibre/iu);
		expect(html).not.toMatch(/hover:(bg|shadow|border|text)/u);
	});
});
