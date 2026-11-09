import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Session } from '$shared/state/session';
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
	const view = render(Harness, {
		props: { session, page: 'booking', onDraft: (found: BookingDraft) => (draft = found) }
	});
	const go = async (page: 'booking' | 'profile') => {
		await view.rerender({ page });
		flushSync();
	};
	return { session, go, draft: () => draft as unknown as BookingDraft };
}

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
