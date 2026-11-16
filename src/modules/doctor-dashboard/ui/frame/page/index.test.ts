import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import {
	DoctorStanding,
	type DoctorStandingFacts,
	type DoctorStandingKind
} from '$shared/state/doctor-standing';
import { InboxBadge } from '$shared/state/inbox-badge';
import { NotificationBadge } from '$shared/state/notification-badge';
import { Session, type SessionStatus } from '$shared/state/session';
import Harness from './frame.harness.svelte';

const children = createRawSnippet(() => ({ render: () => '<main><h1>Σήμερα σελίδα</h1></main>' }));

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function sessionOf(status: SessionStatus) {
	return new Session({
		status: () => status,
		member: () => (status === 'member' ? { firstName: 'Ελένη' } : null),
		signOut: async () => undefined
	});
}

function standingOf(
	kind: DoctorStandingKind | 'unknown',
	{ failed = false, switchTo = vi.fn(async () => true) } = {}
) {
	const facts: DoctorStandingFacts | undefined =
		kind === 'unknown' ? undefined : { kind, notice: null, lastMode: 'DOCTOR', card: null };
	return {
		standing: new DoctorStanding({ facts: () => facts, failed: () => failed, switchTo }),
		switchTo
	};
}

function drawFrame({
	status = 'member',
	kind = 'doctor',
	unread = 0,
	fresh = 0,
	failed = false
}: {
	status?: SessionStatus;
	kind?: DoctorStandingKind | 'unknown';
	unread?: number;
	fresh?: number;
	failed?: boolean;
} = {}) {
	const session = sessionOf(status);
	const { standing, switchTo } = standingOf(kind, { failed });
	render(Harness, {
		props: {
			session,
			standing,
			inbox: new InboxBadge({ count: () => unread }),
			notifications: new NotificationBadge({ count: () => fresh }),
			children
		}
	});
	return { session, switchTo };
}

/** The capsule below 744 (the bar's tabs carry the same name, from 744). */
const capsule = () => screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' })[1];

beforeEach(() => visit('/doctor'));
afterEach(() => visit('/'));

describe('the doctor’s frame (wave 5.1 · screen 65, D-W51-16)', () => {
	it('U-186.2: πλαίσιο γιατρού χωρίς Προφίλ / Συγγενείς — the bar «Σήμερα · Μηνύματα», the capsule «Σήμερα · Μηνύματα · Μενού»; no «Ημερολόγιο» (5.3), no «Ταμείο» on the web', async () => {
		const user = userEvent.setup();
		drawFrame();
		const tabs = screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' });
		const [bar, bottom] = tabs;
		expect(
			within(bar)
				.getAllByRole('link')
				.map((link) => link.textContent?.trim())
		).toEqual(['Σήμερα', 'Μηνύματα']);
		expect(
			within(bottom)
				.getAllByRole('link')
				.map((link) => [link.textContent?.replace(/\s+/gu, ' ').trim(), link.getAttribute('href')])
		).toEqual([
			['Σήμερα', '/doctor'],
			['Μηνύματα', '/doctor/messages'],
			['Μενού', '/doctor/menu']
		]);
		await user.click(screen.getByTestId('doctor-account-menu'));
		const menu = await screen.findByTestId('doctor-account-menu-content');
		const words = `${document.body.textContent} ${menu.textContent}`;
		expect(words).not.toMatch(/Προφίλ|συγγενείς|Ημερολόγιο|Ταμείο|Ρυθμίσεις ιατρείου/u);
	});

	// Rewrites «… «Μηνύματα» leads to the messages of today until step 10» → D-W51-85: the doctor's own messages.
	it('screen 65: «Σήμερα» is the current tab (underlined); 🔴 D-W51-85: «Μηνύματα» leads to the doctor’s own messages, with the dot while something is unread', () => {
		drawFrame({ unread: 2 });
		const today = screen.getByTestId('doctor-nav-today');
		expect(today).toHaveAttribute('aria-current', 'page');
		expect(today.className).toContain('after:bg-foreground');
		expect(screen.getByTestId('doctor-nav-messages')).toHaveAttribute('href', '/doctor/messages');
		expect(screen.getByTestId('doctor-nav-messages-dot')).toHaveAccessibleName('Νέα μηνύματα');
		const messages = within(capsule()).getByRole('link', { name: /Μηνύματα/u });
		expect(messages.querySelector('[data-slot="bottom-nav-badge"]')).toHaveTextContent('2');
	});

	it('🔴 D-W51-31: «Ραντεβού» opens inside the tab «Σήμερα» — on `/doctor/appointments` and under it «Σήμερα» of the bar and of the capsule stays current', () => {
		for (const path of [
			'/doctor/appointments',
			'/doctor/appointments?tab=history',
			'/doctor/appointments/',
			'/doctor/appointments/0193d000-0000-7000-8000-000000000001'
		]) {
			visit(path);
			const view = render(Harness, {
				props: {
					session: sessionOf('member'),
					standing: standingOf('doctor').standing,
					inbox: new InboxBadge({ count: () => 0 }),
					notifications: new NotificationBadge({ count: () => 0 }),
					children
				}
			});
			expect(screen.getByTestId('doctor-nav-today'), path).toHaveAttribute('aria-current', 'page');
			expect(within(capsule()).getByRole('link', { name: /Σήμερα/u }), path).toHaveAttribute(
				'aria-current',
				'page'
			);
			expect(within(capsule()).getByRole('link', { name: /Μενού/u })).not.toHaveAttribute(
				'aria-current'
			);
			view.unmount();
		}
	});

	// D-W51-51 / 52 (card w51-w6) push screen 70 the same way (`m-move.png`): `time` and `services` join 69's two words.
	// Rewrites «screens 69 and 70 are pushed …»: D-W51-62 (card w51-w7) pushes screen 71 the same way (`m-fix.png`).
	it('🔴 D-W51-46 · D-W51-51 · D-W51-62 · U-81.2: screens 69, 70 and 71 are pushed over the tabs below 744 — no capsule (their own bar at the bottom); the 68 and the list keep it', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		const draw = () =>
			render(Harness, {
				props: {
					session: sessionOf('member'),
					standing: standingOf('doctor').standing,
					inbox: new InboxBadge({ count: () => 0 }),
					notifications: new NotificationBadge({ count: () => 0 }),
					children
				}
			});
		for (const path of [
			`/doctor/appointments/${ID}/reject`,
			`/doctor/appointments/${ID}/cancel?tab=requests`,
			`/doctor/appointments/${ID}/time?tab=requests`,
			`/doctor/appointments/${ID}/services`,
			`/doctor/appointments/${ID}/correction?tab=history`
		]) {
			visit(path);
			const view = draw();
			expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' }), path).toHaveLength(1);
			expect(screen.getByTestId('doctor-nav-today'), path).toHaveAttribute('aria-current', 'page');
			view.unmount();
		}
		for (const path of [
			'/doctor/appointments',
			`/doctor/appointments/${ID}`,
			`/doctor/appointments/${ID}/move`
		]) {
			visit(path);
			const view = draw();
			expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' }), path).toHaveLength(2);
			view.unmount();
		}
	});

	it('🔴 D-W51-89 · U-81.2: the doctor’s notifications open inside the tab «Μενού» (its bell, `nt-back`) — the capsule stays, «Μενού» current; the ☰ carries the dot of his side', () => {
		visit('/doctor/notifications');
		render(Harness, {
			props: {
				session: sessionOf('member'),
				standing: standingOf('doctor').standing,
				inbox: new InboxBadge({ count: () => 0 }),
				notifications: new NotificationBadge({ count: () => 2 }),
				children
			}
		});
		expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' })).toHaveLength(2);
		expect(within(capsule()).getByRole('link', { name: /Μενού/u })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(within(capsule()).getByRole('link', { name: /Σήμερα/u })).not.toHaveAttribute(
			'aria-current'
		);
		expect(screen.getByTestId('doctor-account-dot')).toBeInTheDocument();
	});

	it('🔴 D-W51-73 · U-81.2: «Οι ασθενείς μου» opens inside the tab «Μενού» — on `/doctor/patients` and under it «Μενού» of the capsule stays current; «Στοιχεία ασθενή» and the join are pushed over the tabs (no capsule); a look-alike path is no page of it', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		const draw = () =>
			render(Harness, {
				props: {
					session: sessionOf('member'),
					standing: standingOf('doctor').standing,
					inbox: new InboxBadge({ count: () => 0 }),
					notifications: new NotificationBadge({ count: () => 0 }),
					children
				}
			});
		for (const path of [
			'/doctor/patients',
			`/doctor/patients/account/${ID}`,
			`/doctor/patients/relative/${ID}`,
			`/doctor/patients/record/${ID}`
		]) {
			visit(path);
			const view = draw();
			expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' }), path).toHaveLength(2);
			expect(within(capsule()).getByRole('link', { name: /Μενού/u }), path).toHaveAttribute(
				'aria-current',
				'page'
			);
			expect(within(capsule()).getByRole('link', { name: /Σήμερα/u }), path).not.toHaveAttribute(
				'aria-current'
			);
			view.unmount();
		}
		for (const path of [
			`/doctor/patients/record/${ID}/edit`,
			`/doctor/patients/record/${ID}/merge`
		]) {
			visit(path);
			const view = draw();
			expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' }), path).toHaveLength(1);
			view.unmount();
		}
		for (const path of ['/doctor/patientsx', '/doctor/patient', '/patients']) {
			visit(path);
			const view = draw();
			expect(within(capsule()).getByRole('link', { name: /Μενού/u }), path).not.toHaveAttribute(
				'aria-current'
			);
			view.unmount();
		}
	});

	it('🔴 D-W51-85 · U-81.2: the doctor’s messages are the tab «Μηνύματα» — current in the bar and the capsule on the list and under it; a conversation, one the doctor starts and the archive are pushed over the tabs (no capsule, `m-thread.png`); a look-alike path is no page of it', () => {
		const ID = '0193d000-0000-7000-8000-000000000001';
		const draw = () =>
			render(Harness, {
				props: {
					session: sessionOf('member'),
					standing: standingOf('doctor').standing,
					inbox: new InboxBadge({ count: () => 0 }),
					notifications: new NotificationBadge({ count: () => 0 }),
					children
				}
			});
		visit('/doctor/messages');
		let view = draw();
		expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' })).toHaveLength(2);
		expect(screen.getByTestId('doctor-nav-messages')).toHaveAttribute('aria-current', 'page');
		expect(within(capsule()).getByRole('link', { name: /Μηνύματα/u })).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByTestId('doctor-nav-today')).not.toHaveAttribute('aria-current');
		view.unmount();
		for (const path of [
			`/doctor/messages/${ID}`,
			'/doctor/messages/archive',
			'/doctor/messages/new'
		]) {
			visit(path);
			view = draw();
			expect(screen.getAllByRole('navigation', { name: 'Καρτέλες γιατρού' }), path).toHaveLength(1);
			expect(screen.getByTestId('doctor-nav-messages'), path).toHaveAttribute(
				'aria-current',
				'page'
			);
			view.unmount();
		}
		visit('/doctor/messagesx');
		view = draw();
		expect(screen.getByTestId('doctor-nav-messages')).not.toHaveAttribute('aria-current');
		view.unmount();
	});

	it('(negative) D-W51-31: a look-alike path is no page under «Ραντεβού» — «Σήμερα» is not current there', () => {
		for (const path of ['/doctor/appointmentsx', '/doctor/appointment', '/appointments']) {
			visit(path);
			const view = render(Harness, {
				props: {
					session: sessionOf('member'),
					standing: standingOf('doctor').standing,
					inbox: new InboxBadge({ count: () => 0 }),
					notifications: new NotificationBadge({ count: () => 0 }),
					children
				}
			});
			expect(screen.getByTestId('doctor-nav-today'), path).not.toHaveAttribute('aria-current');
			view.unmount();
		}
	});

	it('screen 76 (5.1): the ☰ — Ειδοποιήσεις (its dot) · Οι ασθενείς μου · Ρυθμίσεις λογαριασμού · Κέντρο βοήθειας · Όροι γιατρών · Λειτουργία ασθενή (744–1127) · Αποσύνδεση', async () => {
		const user = userEvent.setup();
		drawFrame({ fresh: 1 });
		expect(screen.getByTestId('doctor-account-dot')).toBeInTheDocument();
		await user.click(screen.getByTestId('doctor-account-menu'));
		const menu = await screen.findByTestId('doctor-account-menu-content');
		expect(
			within(menu)
				.getAllByRole('menuitem')
				.map((item) => [item.textContent?.trim(), item.getAttribute('href')])
		).toEqual([
			// Rewrites «Ειδοποιήσεις ⇒ `/notifications`» (D-W51-18, the transition) by D-W51-89 (step 11, screen 75): the
			// doctor's own list.
			['Ειδοποιήσεις', '/doctor/notifications'],
			// D-W51-73 (card w51-w9): «Οι ασθενείς μου», since step 9 (D-W51-04).
			['Οι ασθενείς μου', '/doctor/patients'],
			['Ρυθμίσεις λογαριασμού', '/profile/account-settings'],
			['Κέντρο βοήθειας', '/help'],
			['Όροι γιατρών', '/legal/doctor-marketplace-terms'],
			['Λειτουργία ασθενή', '/'],
			['Αποσύνδεση', null]
		]);
		expect(within(menu).getByTestId('doctor-account-entry-notifications')).toHaveAccessibleName(
			'Ειδοποιήσεις, νέες'
		);
		expect(within(menu).getByTestId('doctor-account-entry-patient-mode')).toHaveClass(
			'laptop:hidden'
		);
	});

	it('«Λειτουργία ασθενή» of the bar (from 1128) and of the ☰ switch in place — the transition, then the home', async () => {
		const user = userEvent.setup();
		const { switchTo } = drawFrame();
		const inBar = screen.getByTestId('doctor-bar-patient-mode');
		expect(inBar).toHaveClass('hidden', 'laptop:inline-flex');
		await user.click(inBar);
		expect(switchTo).toHaveBeenCalledWith('PATIENT');
		await user.click(screen.getByTestId('doctor-account-menu'));
		await user.click(await screen.findByTestId('doctor-account-entry-patient-mode'));
		expect(switchTo).toHaveBeenCalledTimes(2);
	});

	it('D-W51-19: the gate — the wait until the answer, then the page for a licence of the marketplace', () => {
		drawFrame({ kind: 'unknown' });
		expect(screen.getByTestId('doctor-frame-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByRole('heading', { name: 'Σήμερα σελίδα' })).toBeNull();
	});

	it('D-W51-19: a licensed doctor reads the page', () => {
		drawFrame();
		expect(screen.getByRole('heading', { name: 'Σήμερα σελίδα' })).toBeInTheDocument();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it.each(['none', 'pending', 'payments'] as const)(
		'U-185.1 (negative): μη γιατρός / pending / μόνο ταμείου στο `/doctor` ⇒ `/` — %s',
		async (kind) => {
			drawFrame({ kind });
			await waitFor(() =>
				expect(vi.mocked(goto)).toHaveBeenCalledWith('/', { replaceState: true })
			);
			expect(screen.queryByRole('heading', { name: 'Σήμερα σελίδα' })).toBeNull();
		}
	);

	it('(negative) a guest signs in first (`requireSignIn`); one who leaves the sign-in goes home', async () => {
		const { session } = drawFrame({ status: 'guest', kind: 'doctor' });
		await waitFor(() => expect(session.flowOpen).toBe(true));
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		session.cancelSignIn();
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalledWith('/', { replaceState: true }));
	});

	it('a read that got no answer says so, with «Δοκιμάστε ξανά»', () => {
		drawFrame({ kind: 'unknown', failed: true });
		expect(screen.getByTestId('doctor-frame-load-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα.'
		);
		expect(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' })).toBeInTheDocument();
	});
});
