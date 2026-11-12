import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Session } from '$shared/state/session';
import type { AppointmentsMemory } from '$modules/appointments/ui/memory';
import Harness from './booking-draft.harness.svelte';
import type { BookingDraft } from '../hooks/booking-draft.svelte';

/** A signed-in patient's session (made-up), whose sign-out the server carries out. */
const member = () =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => true,
		expire: () => {}
	});

function mount(session = member()) {
	let draft: BookingDraft | null = null;
	let memory: AppointmentsMemory | null = null;
	const view = render(Harness, {
		props: {
			session,
			page: 'booking',
			onDraft: (found: BookingDraft) => (draft = found),
			onMemory: (found: AppointmentsMemory) => (memory = found)
		}
	});
	const go = async (page: 'booking' | 'profile') => {
		await view.rerender({ page });
		flushSync();
	};
	return {
		session,
		go,
		draft: () => draft as unknown as BookingDraft,
		memory: () => memory as unknown as AppointmentsMemory
	};
}

const APPOINTMENT = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

/** A memory holding a save (or a cancellation, which takes its place) and a relative chosen for the appointment. */
function fill(memory: AppointmentsMemory, write: 'saved' | 'canceled' = 'saved') {
	if (write === 'saved') memory.remember(APPOINTMENT, { kind: 'note', removed: false });
	else memory.rememberCanceled(APPOINTMENT);
	memory.choose(APPOINTMENT, 'rel-1');
}

const emptied = (memory: AppointmentsMemory) => ({
	saved: memory.saved,
	canceledId: memory.canceledId,
	pendingVisitor: memory.pendingVisitor
});

const note = () => screen.getByLabelText('Σημείωση') as HTMLTextAreaElement;

describe('appointments::booking-draft host (🔴 U-112.2)', () => {
	it('🔴 U-112.2: τα στοιχεία δεν χάνονται — to the doctor’s page and back, the note is as the person left it', async () => {
		const user = userEvent.setup({ delay: null });
		const { go, draft } = mount();
		draft().enter('maria', { office: 'off-a', date: '2026-11-08', time: '09:30' });
		await user.type(note(), 'Πόνος στο γόνατο');
		await go('profile');
		expect(screen.getByText('Προφίλ γιατρού')).toBeInTheDocument();
		await go('booking');
		expect(note()).toHaveValue('Πόνος στο γόνατο');
		expect(draft().slot?.startMinute).toBe(570);
	});

	it('🔴 U-65.6: a sign-out empties it; another account in the tab too', async () => {
		const { session, draft } = mount();
		draft().note = 'Προσωπικό';
		await session.signOut();
		flushSync();
		expect(draft().note).toBe('');
		draft().note = 'Άλλο';
		session.accountChanged();
		flushSync();
		expect(draft().note).toBe('');
	});

	it('(negative) a session that merely ended keeps the words for the same person', () => {
		const { session, draft } = mount();
		draft().note = 'Μένει';
		session.expire({ action: 'book' });
		flushSync();
		expect(draft().note).toBe('Μένει');
	});
});

describe('appointments::booking-draft host · the appointments’ memory (🔴 D-W4-33, review w4-w4 R1 MINOR-5)', () => {
	const NOTHING = { saved: null, canceledId: null, pendingVisitor: null };

	it('one memory above the pages: what a page wrote is there for the next (the 54 leads to the appointment)', async () => {
		const { go, memory } = mount();
		const first = memory();
		first.remember(APPOINTMENT, { kind: 'note', removed: true });
		await go('profile');
		expect(memory()).toBe(first);
		expect(memory().doneOf(APPOINTMENT)).toEqual({ kind: 'note', removed: true });
	});

	it('🔴 U-65.6 (P-W4 §7): a sign-out empties it — the old hour, the cancellation, the relative chosen; another account in the tab too', async () => {
		const { session, memory } = mount();
		fill(memory());
		expect(memory().doneOf(APPOINTMENT)).not.toBeNull();
		expect(memory().chosenFor(APPOINTMENT)).toBe('rel-1');
		await session.signOut();
		flushSync();
		expect(emptied(memory())).toEqual(NOTHING);

		fill(memory(), 'canceled');
		expect(memory().justCanceled(APPOINTMENT)).toBe(true);
		session.accountChanged();
		flushSync();
		expect(emptied(memory())).toEqual(NOTHING);
	});

	it('(negative) a session that merely ended keeps it for the same person', () => {
		const { session, memory } = mount();
		fill(memory());
		session.expire({ action: 'book' });
		flushSync();
		expect(memory().doneOf(APPOINTMENT)).toEqual({ kind: 'note', removed: false });
		expect(memory().chosenFor(APPOINTMENT)).toBe('rel-1');
	});
});
