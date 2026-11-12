import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { flushSync, type Component } from 'svelte';
import { afterNavigate } from '$app/navigation';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import type { Session, SessionStatus } from '$shared/state/session';
import type { AppointmentsAddress } from '$modules/appointments/lib/paths';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import Harness from './use-pages.harness.svelte';

/*
 * The module's ONE hook of the patient's pages (review w4-w9-r1 NIT-1): what it tells the two screens in each of its two
 * ways of working — the appointments' own address (screens 50–53), the invitation of screen 54 — and 🔴 D-W4-78, what a
 * session that ended on a write keeps open. The server's «now» Tuesday 10 November 21:00 in Athens. Made-up people.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const A1 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
const A2 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5c';
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';

const view = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'booked',
	bookedForType: 'SELF',
	relativeId: null,
	startTime: '2026-11-12T10:30:00.000Z',
	endTime: '2026-11-12T11:00:00.000Z',
	confirmedAt: '2026-11-01T09:00:00.000Z',
	patientNote: 'Η σημείωσή μου',
	serviceLines: [],
	...extra
});

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

type Told = {
	viewer: string;
	tab: string;
	openId: string | null;
	step: string | null;
	paneKey: string | null;
	paneEmpty: boolean;
	opened: string | null;
	openedNote: string | null;
	visit: string | null;
	visitLoading: boolean;
	visitMissing: boolean;
	rows: string[];
	listLoading: boolean;
	doctorIds: string[];
	invitation: string | null;
	done: unknown;
};
type Handle = {
	session: Session;
	go: (next: AppointmentsAddress) => void;
	signIn: () => void;
	otherSignsIn: (patient?: boolean) => void;
};

let calls: string[];
/** One appointment's answer by id; `null` answers `404`. */
let details: Record<string, Record<string, unknown> | null>;
/** An appointment whose answer waits until the test lets it go. */
let held: { id: string; wait: Promise<void> } | null;
let invitationAnswer: () => Response;

function hold(id: string) {
	let release = () => {};
	held = { id, wait: new Promise<void>((resolve) => (release = resolve)) };
	return () => release();
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	held = null;
	details = {
		[A1]: { ...view(A1), actions: { canCancel: true, canReschedule: true } },
		[A2]: {
			...view(A2, { status: 'completed', startTime: '2026-10-22T07:00:00.000Z' }),
			actions: { canCancel: false, canReschedule: false }
		}
	};
	invitationAnswer = () =>
		json({
			invitationId: INVITATION,
			appointmentId: A2,
			status: 'OPEN',
			expiresAt: '2026-12-21T08:00:00.000Z',
			canSubmit: true,
			submitBlocker: null,
			ratingId: null,
			patientName: 'Ελένη',
			patientInitial: 'Π'
		});
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const path = input.replace(/^.*\/api\/v1/u, '');
			calls.push(path);
			if (path.startsWith('/appointment-rating/rating-invitations/')) return invitationAnswer();
			if (path.startsWith('/appointment/appointments?')) {
				const items = path.includes('scope=history') ? [view(A2)] : [view(A1)];
				return json({ items, nextCursor: null, total: items.length });
			}
			if (path.startsWith('/appointment/appointments/')) {
				const id = path.slice('/appointment/appointments/'.length);
				if (held && id === held.id) await held.wait;
				const detail = details[id];
				return detail ? json(detail) : json({}, 404);
			}
			return json({});
		})
	);
	wideScreen(false);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

function wideScreen(matches: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
}

function draw(props: {
	start?: SessionStatus;
	hasPatientProfile?: boolean;
	address?: AppointmentsAddress;
	invitationId?: string;
	memory?: AppointmentsMemory;
}) {
	let handle: Handle | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ...props, onReady: (found: Handle) => (handle = found) }
		}
	});
	return () => handle as Handle;
}

const told = (): Told => JSON.parse(screen.getByTestId('pages').textContent ?? '{}') as Told;
const listReads = () => calls.filter((path) => path.startsWith('/appointment/appointments?'));
const detailReads = (id: string) =>
	calls.filter((path) => path === `/appointment/appointments/${id}`);
const LIST: AppointmentsAddress = { view: 'list', tab: 'upcoming' };
const at = (appointmentId: string, step: 'note' | 'cancel' | null = null): AppointmentsAddress => ({
	view: 'appointment',
	appointmentId,
	step
});

describe('useAppointmentsPages · the appointments’ own address (screens 50–53)', () => {
	it('the list’s address: its tab, the list read for a member, nothing open — and the tab follows the address', async () => {
		const handle = draw({ address: LIST });
		await waitFor(() => expect(told().rows).toEqual([A1]));
		expect(told()).toMatchObject({
			viewer: 'member',
			tab: 'upcoming',
			openId: null,
			step: null,
			paneKey: null,
			paneEmpty: false,
			opened: null,
			doctorIds: ['doc-maria']
		});
		expect(listReads()).toHaveLength(1);
		expect(listReads()[0]).toContain('scope=upcoming');
		flushSync(() => handle().go({ view: 'list', tab: 'history' }));
		expect(told().tab).toBe('history');
		await waitFor(() => expect(told().rows).toEqual([A2]));
	});

	it('U-80.1 Ε6 (negative): a guest and the wait ask the server nothing; the appointments’ pages never open the sign-in by themselves', async () => {
		const guest = draw({ start: 'guest', address: at(A1, 'note') });
		await Promise.resolve();
		expect(told()).toMatchObject({ viewer: 'guest', opened: null, visit: null, paneEmpty: false });
		expect(guest().session.flowOpen).toBe(false);
		expect(calls).toEqual([]);
		document.body.innerHTML = '';
		draw({ start: 'unknown', address: LIST });
		await Promise.resolve();
		expect(told().viewer).toBe('waiting');
		expect(calls).toEqual([]);
	});

	it('an appointment’s address below 950: the appointment read, its own tab (a closed visit ⇒ «Ιστορικό»), the screen it opened, its key — and the list NOT read under it (D-103)', async () => {
		const handle = draw({ address: at(A2) });
		await waitFor(() => expect(told().opened).toBe(A2));
		expect(told()).toMatchObject({
			openId: A2,
			step: null,
			paneKey: `${A2}/`,
			tab: 'history',
			rows: [],
			doctorIds: ['doc-maria']
		});
		expect(listReads()).toEqual([]);
		flushSync(() => handle().go(at(A1, 'cancel')));
		expect(told()).toMatchObject({ openId: A1, step: 'cancel', paneKey: `${A1}/cancel` });
		// Until the next one is read, the tab last shown — never the address's default.
		expect(told().tab).toBe('history');
		await waitFor(() => expect(told().opened).toBe(A1));
		expect(told().tab).toBe('upcoming');
	});

	it('from 950 the list is read once the appointment told its tab — never the wrong tab first — and its wait stands meanwhile', async () => {
		wideScreen(true);
		const release = hold(A2);
		draw({ address: at(A2) });
		await waitFor(() => expect(detailReads(A2)).toHaveLength(1));
		expect(told()).toMatchObject({ listLoading: true, rows: [], visitLoading: true });
		expect(listReads()).toEqual([]);
		release();
		await waitFor(() => expect(told().rows).toEqual([A2]));
		expect(listReads()).toHaveLength(1);
		expect(listReads()[0]).toContain('scope=history');
	});

	it('🔴 U-139.1 `paneEmpty`: an appointment not found (404) leaves the right column with nothing — never while it is read; (negative) an account with no patient reads no list', async () => {
		details[A1] = null;
		const release = hold(A1);
		draw({ address: at(A1), hasPatientProfile: false });
		await waitFor(() => expect(detailReads(A1)).toHaveLength(1));
		expect(told()).toMatchObject({ paneEmpty: false, visitLoading: true });
		release();
		await waitFor(() => expect(told().visitMissing).toBe(true));
		expect(told()).toMatchObject({ paneEmpty: true, opened: null });
		expect(listReads()).toEqual([]);
	});

	it('🔴 D-W4-33: what was just saved is said on its own appointment only, and is let go once another opens', async () => {
		const memory = new AppointmentsMemory();
		memory.remember(A1, { kind: 'note', removed: false });
		const handle = draw({ address: at(A1), memory });
		await waitFor(() => expect(told().opened).toBe(A1));
		expect(told().done).toEqual({ kind: 'note', removed: false });
		flushSync(() => handle().go(at(A2)));
		await waitFor(() => expect(told().opened).toBe(A2));
		expect(told().done).toBeNull();
		expect(memory.doneOf(A1)).toBeNull();
	});

	/** What the router does when a navigation ended, AFTER it put the entry's scroll back: the page's `afterNavigate`. */
	const arrive = () => {
		for (const [told] of vi.mocked(afterNavigate).mock.calls as unknown as [() => void][]) told();
	};
	const watchTheTop = () => {
		const top = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		onTestFinished(() => top.mockRestore());
		return top;
	};

	it('🔴 U-153 (card w4-w12): back on the appointment with a notice just written, its page starts at the TOP — asked once the router has put the scroll back, and ONCE per write; (negative) never on the screen that wrote it, never on a later return with no new write', async () => {
		const top = watchTheTop();
		const memory = new AppointmentsMemory();
		const handle = draw({ address: at(A1, 'note'), memory });
		await waitFor(() => expect(told().opened).toBe(A1));
		memory.remember(A1, { kind: 'note', removed: false });
		arrive();
		expect(top).not.toHaveBeenCalled();

		flushSync(() => handle().go(at(A1)));
		arrive();
		expect(top).toHaveBeenCalledTimes(1);
		expect(top).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });

		// A screen opened again and left with nothing saved: the notice is still said, the page keeps its place.
		flushSync(() => handle().go(at(A1, 'note')));
		arrive();
		flushSync(() => handle().go(at(A1)));
		arrive();
		expect(told().done).toEqual({ kind: 'note', removed: false });
		expect(top).toHaveBeenCalledTimes(1);

		// A cancellation is a write too: once again, once.
		memory.rememberCanceled(A1);
		arrive();
		arrive();
		expect(top).toHaveBeenCalledTimes(2);
	});

	it('U-153 (negative): with no write nothing is asked of the scroll; a notice written for ANOTHER appointment moves neither this page nor, once let go, its own', async () => {
		const top = watchTheTop();
		const memory = new AppointmentsMemory();
		const handle = draw({ address: at(A1), memory });
		await waitFor(() => expect(told().opened).toBe(A1));
		arrive();
		flushSync(() => handle().go(LIST));
		arrive();
		expect(top).not.toHaveBeenCalled();

		memory.remember(A1, { kind: 'for-whom' });
		flushSync(() => handle().go(at(A2)));
		arrive();
		flushSync(() => handle().go(at(A1)));
		arrive();
		expect(top).not.toHaveBeenCalled();
	});
});

describe('useAppointmentsPages · the invitation of screen 54', () => {
	it('U-138.3: a guest asks the server nothing and the sign-in opens over the form ONCE', async () => {
		const handle = draw({ start: 'guest', invitationId: INVITATION });
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		expect(told()).toMatchObject({ viewer: 'guest', invitation: null, openId: null });
		expect(calls).toEqual([]);
		handle().session.cancelSignIn();
		await Promise.resolve();
		flushSync();
		expect(handle().session.flowOpen).toBe(false);
	});

	it('a member: the invitation, then the visit it names — «Ιστορικό», the invitation’s id as the key, no memory of a write; below 950 no list, from 950 the list once the visit is read', async () => {
		draw({ invitationId: INVITATION });
		await waitFor(() => expect(told().visit).toBe(A2));
		expect(told()).toMatchObject({
			invitation: INVITATION,
			openId: A2,
			step: null,
			paneKey: INVITATION,
			tab: 'history',
			done: null,
			paneEmpty: false
		});
		expect(listReads()).toEqual([]);
		document.body.innerHTML = '';
		calls = [];
		wideScreen(true);
		draw({ invitationId: INVITATION });
		expect(told()).toMatchObject({ tab: 'history', listLoading: true });
		await waitFor(() => expect(told().rows).toEqual([A2]));
		expect(listReads()).toHaveLength(1);
		expect(listReads()[0]).toContain('scope=history');
	});

	it('🔴 U-139.1 (negative): an invitation that is not this account’s leaves the right column with nothing, and no visit is asked', async () => {
		invitationAnswer = () =>
			new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		draw({ invitationId: INVITATION });
		await waitFor(() => expect(told().paneEmpty).toBe(true));
		expect(told()).toMatchObject({ invitation: null, openId: null, visit: null });
		expect(calls.filter((path) => path.startsWith('/appointment/appointments'))).toEqual([]);
	});
});

describe('useAppointmentsPages · 🔴 D-W4-78 (U-84): `opened` through a session that ended on a write', () => {
	/** A member on screen 52's note, then the write's `401` as the site's host carries it out. */
	async function expired(address: AppointmentsAddress = at(A1, 'note')) {
		const handle = draw({ address });
		await waitFor(() => expect(told().opened).toBe(A1));
		flushSync(() => handle().session.expire({}));
		return handle;
	}

	it('the `401`: the personal read is gone and nobody is asked, yet `opened` is the same appointment under the sign-in; the same person back keeps it while it is read anew, then stands on the new read', async () => {
		const handle = await expired();
		expect(told()).toMatchObject({
			viewer: 'guest',
			visit: null,
			opened: A1,
			openedNote: 'Η σημείωσή μου',
			paneEmpty: false,
			step: 'note',
			paneKey: `${A1}/note`
		});
		expect(detailReads(A1)).toHaveLength(1);

		details[A1] = { ...view(A1, { patientNote: 'Όπως τη διαβάζει ο server τώρα' }), actions: {} };
		const release = hold(A1);
		flushSync(() => handle().signIn());
		expect(told()).toMatchObject({
			viewer: 'member',
			visit: null,
			visitLoading: true,
			opened: A1,
			openedNote: 'Η σημείωσή μου'
		});
		release();
		await waitFor(() => expect(told().visit).toBe(A1));
		expect(told().openedNote).toBe('Όπως τη διαβάζει ο server τώρα');
		expect(detailReads(A1)).toHaveLength(2);
	});

	it('(negative · α) a guest who opens the address has nothing kept: `opened` is `null`, before and after a sign-in is asked', async () => {
		const handle = draw({ start: 'guest', address: at(A1, 'note') });
		expect(told().opened).toBeNull();
		flushSync(() => handle().session.requireSignIn());
		expect(handle().session.expired).toBe(false);
		expect(told().opened).toBeNull();
	});

	it('(negative · β) a sign-out by hand, a sign-out in another tab and another account: `opened` is `null` AT ONCE — with no ended session, and over one', async () => {
		const byHand = draw({ address: at(A1, 'note') });
		await waitFor(() => expect(told().opened).toBe(A1));
		await byHand().session.signOut();
		flushSync();
		expect(told()).toMatchObject({ viewer: 'guest', opened: null });

		document.body.innerHTML = '';
		const elsewhere = await expired();
		expect(told().opened).toBe(A1);
		flushSync(() => elsewhere().session.signedOutElsewhere());
		expect(told()).toMatchObject({ viewer: 'guest', opened: null });

		document.body.innerHTML = '';
		const other = draw({ address: at(A1, 'note') });
		await waitFor(() => expect(told().opened).toBe(A1));
		hold(A1);
		other().otherSignsIn();
		flushSync();
		expect(told()).toMatchObject({ viewer: 'member', opened: null, visitLoading: true });
	});

	it('(negative · γ) the sign-in closed without signing in: `opened` is `null`, and STAYS `null` for whoever signs in later until their own read answers', async () => {
		const handle = await expired();
		flushSync(() => handle().session.cancelSignIn());
		expect(told()).toMatchObject({ viewer: 'guest', opened: null });
		const release = hold(A1);
		flushSync(() => handle().signIn());
		expect(told()).toMatchObject({ viewer: 'member', opened: null, visitLoading: true });
		release();
		await waitFor(() => expect(told().opened).toBe(A1));
	});

	it('(negative · δ) another account over the ended session: `opened` is `null` the moment it is known — while its read is on its way, and when that read is refused', async () => {
		const handle = await expired();
		details[A1] = null;
		const release = hold(A1);
		handle().otherSignsIn();
		flushSync();
		expect(told()).toMatchObject({ viewer: 'member', opened: null, visitLoading: true });
		release();
		await waitFor(() => expect(told().visitMissing).toBe(true));
		expect(told()).toMatchObject({ opened: null, paneEmpty: true });
	});

	it('(negative · δ) an account the server knows no patient for (its account is told apart later, by the doctor’s read): never the patient’s form — not under the sign-in, not after it', async () => {
		const handle = await expired();
		hold(A1);
		handle().otherSignsIn(false);
		flushSync();
		expect(told().opened).toBeNull();
	});

	it('(negative) the same person back, but the appointment is no longer theirs to read (404): `opened` gives way to «δεν βρέθηκε» — the kept one never outlives the server’s answer', async () => {
		const handle = await expired();
		details[A1] = null;
		flushSync(() => handle().signIn());
		expect(told().opened).toBe(A1);
		await waitFor(() => expect(told().visitMissing).toBe(true));
		expect(told()).toMatchObject({ opened: null, paneEmpty: true });
	});

	it('(negative) what was kept for one appointment never stands in for another: under the sign-in another address shows nothing of it', async () => {
		const handle = await expired();
		flushSync(() => handle().go(at(A2, 'note')));
		expect(told()).toMatchObject({ openId: A2, opened: null });
		flushSync(() => handle().go(at(A1, 'note')));
		expect(told().opened).toBeNull();
	});
});
