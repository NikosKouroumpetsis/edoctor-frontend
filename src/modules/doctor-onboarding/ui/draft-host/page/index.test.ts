import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { Session } from '$shared/state/session';
import Harness from './draft-host.harness.svelte';
import type { OnboardingDraft } from '../hooks/onboarding-draft.svelte';

/** A signed-in doctor's session (made-up), whose sign-out the server carries out. */
const member = () =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Νίκος' }),
		signOut: async () => true,
		expire: () => {}
	});

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

function mount(session = member()) {
	let draft: OnboardingDraft | null = null;
	const view = render(Harness, {
		props: { session, page: 'basic', onDraft: (found: OnboardingDraft) => (draft = found) }
	});
	const go = async (page: 'basic' | 'office' | 'help') => {
		await view.rerender({ page });
		flushSync();
	};
	return { view, session, go, draft: () => draft as unknown as OnboardingDraft };
}

describe('doctor-onboarding::draft-host (🔴 U-112.2: the details are not lost)', () => {
	afterEach(() => vi.restoreAllMocks());

	it('🔴 U-112.2: τα στοιχεία δεν χάνονται — back and forth between the steps, out to another page and back: every value as the person left it', async () => {
		const user = userEvent.setup({ delay: null });
		const { go } = mount();
		expect(field('Όνομα')).toHaveValue('Νίκος');
		await user.clear(field('Όνομα'));
		await user.type(field('Όνομα'), 'Νικόλαος');

		await go('office');
		await user.type(field('Τηλέφωνο ιατρείου'), '210 412 3456');
		await user.type(field('Οδηγίες'), 'Είσοδος από την πίσω πλευρά.');

		// «Βοήθεια»: another page of the site, then the browser's back.
		await go('help');
		expect(screen.getByText('Κέντρο βοήθειας')).toBeInTheDocument();
		await go('office');
		expect(field('Τηλέφωνο ιατρείου')).toHaveValue('210 412 3456');
		expect(field('Οδηγίες')).toHaveValue('Είσοδος από την πίσω πλευρά.');

		// «Πίσω» twice, then forward again.
		await go('basic');
		expect(field('Όνομα')).toHaveValue('Νικόλαος');
		expect(field('Επώνυμο')).toHaveValue('Παπαδόπουλος');
		await go('office');
		expect(field('Τηλέφωνο ιατρείου')).toHaveValue('210 412 3456');
	});

	it('🔴 U-112.2: a reload (a new page tree) starts from the server’s progress — what was not sent with «Επόμενο» is gone, as the record says', async () => {
		const user = userEvent.setup({ delay: null });
		const first = mount();
		await user.clear(field('Όνομα'));
		await user.type(field('Όνομα'), 'Νικόλαος');
		first.view.unmount();
		const second = mount();
		expect(field('Όνομα')).toHaveValue('Νίκος');
		expect(second.draft().edits).toEqual({});
	});

	it('U-112.2: after «Επόμενο» the step’s changes leave the draft and the screen reads the server again', async () => {
		const user = userEvent.setup({ delay: null });
		const { draft, go } = mount();
		await user.clear(field('Όνομα'));
		await user.type(field('Όνομα'), 'Ελένη');
		draft().clear('basicInfo');
		await go('help');
		await go('basic');
		expect(field('Όνομα')).toHaveValue('Νίκος');
	});

	it('🔴 U-112.2 / U-65.6: a sign-out empties the draft — whoever signs in next in this browser starts blank', async () => {
		const user = userEvent.setup({ delay: null });
		const { draft, session, go } = mount();
		await go('office');
		await user.type(field('Τηλέφωνο ιατρείου'), '6912345678');
		await session.signOut();
		flushSync();
		expect(draft().edits).toEqual({});
		await go('help');
		await go('office');
		expect(field('Τηλέφωνο ιατρείου')).toHaveValue('');
	});

	it('🔴 U-112.2 / U-65.6: another account in the tab empties it too', async () => {
		const user = userEvent.setup({ delay: null });
		const { draft, session } = mount();
		await user.type(field('Επώνυμο'), 'ς');
		expect(draft().dirty).toBe(true);
		session.accountChanged();
		flushSync();
		expect(draft().edits).toEqual({});
	});

	it('U-112.2 (negative): a session that merely ended (`expire`, a 401 on a save) keeps the words — the same person signs in again and finds them', async () => {
		const user = userEvent.setup({ delay: null });
		const { draft, session } = mount();
		await user.clear(field('Όνομα'));
		await user.type(field('Όνομα'), 'Νικόλαος');
		session.expire();
		flushSync();
		expect(draft().edits).toEqual({ basicInfo: { firstName: 'Νικόλαος' } });
		expect(field('Όνομα')).toHaveValue('Νικόλαος');
	});

	it('U-112.2 (negative): a sign-out the server did not carry out keeps them (the member is still signed in)', async () => {
		const user = userEvent.setup({ delay: null });
		const session = new Session({
			status: () => 'member',
			member: () => ({ firstName: 'Νίκος' }),
			signOut: async () => false
		});
		const { draft } = mount(session);
		await user.type(field('Επώνυμο'), 'ς');
		await session.signOut();
		flushSync();
		expect(draft().edits).toEqual({ basicInfo: { lastName: 'Παπαδόπουλοςς' } });
	});

	it('🔴 U-112.2: no leak between visitors — two page trees (two requests on the server) hold two drafts, each its own', async () => {
		const user = userEvent.setup({ delay: null });
		const one = mount();
		const firstDraft = one.draft();
		await user.clear(field('Όνομα'));
		await user.type(field('Όνομα'), 'Πρώτος');
		const two = render(Harness, { props: { session: member(), page: 'help' } });
		let secondDraft: OnboardingDraft | null = null;
		await two.rerender({
			page: 'basic',
			onDraft: (found: OnboardingDraft) => (secondDraft = found)
		});
		flushSync();
		expect(secondDraft).not.toBeNull();
		expect(secondDraft).not.toBe(firstDraft);
		expect((secondDraft as unknown as OnboardingDraft).edits).toEqual({});
		expect(firstDraft.edits).toEqual({ basicInfo: { firstName: 'Πρώτος' } });
	});

	it('🔴 U-112.2 / U-65.6: nothing typed reaches a storage, a cookie or the address — the words live in the page’s memory only', async () => {
		const user = userEvent.setup({ delay: null });
		const stored = vi.spyOn(Storage.prototype, 'setItem');
		const cookie = vi.spyOn(Document.prototype, 'cookie', 'set');
		const pushed = vi.spyOn(history, 'pushState');
		const replaced = vi.spyOn(history, 'replaceState');
		const before = window.location.href;
		const { go } = mount();
		await user.type(field('Επώνυμο'), '-Κ');
		await go('office');
		await user.type(field('Τηλέφωνο ιατρείου'), '6912345678');
		await go('basic');
		expect(stored).not.toHaveBeenCalled();
		expect(cookie).not.toHaveBeenCalled();
		expect(pushed).not.toHaveBeenCalled();
		expect(replaced).not.toHaveBeenCalled();
		expect(window.location.href).toBe(before);
		expect(window.location.href).not.toContain('6912345678');
	});

	it('U-65.6 (negative): a hostile text comes back as the same letters, never as markup', async () => {
		const user = userEvent.setup({ delay: null });
		const { go, draft } = mount();
		await go('office');
		const hostile = '<img src=x onerror=alert(1)>';
		await user.type(field('Οδηγίες'), hostile.replace(/[{[]/gu, '$&$&'));
		await go('help');
		await go('office');
		expect(field('Οδηγίες')).toHaveValue(hostile);
		expect(document.querySelector('img')).toBeNull();
		expect(draft().read('office', 'gettingThere', '')).toBe(hostile);
	});
});
