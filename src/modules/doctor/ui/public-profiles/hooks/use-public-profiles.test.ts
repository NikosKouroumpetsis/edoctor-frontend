import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { flushSync, type Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import Harness from './use-public-profiles.harness.svelte';

/*
 * 🔴 Live check w4-live-web Σ1: the doctors of the page change as the person moves inside «Τα ραντεβού μου» (a list of
 * several doctors ⇒ one appointment's ONE doctor ⇒ another tab's doctors). The set shrinks by more than one at once and
 * grows again; nothing may throw, and every line follows the ids it is asked for. Made-up doctors.
 */

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const NAMES: Record<string, string> = {
	'doc-a': 'Άννα Αλεξίου',
	'doc-b': 'Βασίλης Βλάχος',
	'doc-c': 'Γιώργος Γεωργίου',
	'doc-d': 'Δήμητρα Δούκα'
};

let asked: string[];

beforeEach(() => {
	asked = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const doctorId = decodeURIComponent(
				new URL(input).pathname.replace(/^.*\/doctor\/public\/doctors\//u, '')
			);
			asked.push(doctorId);
			if (!NAMES[doctorId]) return json({}, 404);
			return json({ doctor: { doctorId, slug: doctorId, fullName: NAMES[doctorId] } });
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function draw(ids: readonly string[], enabled = true) {
	let handle: { ask: (next: readonly string[]) => void } | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { ids, enabled, onReady: (found: NonNullable<typeof handle>) => (handle = found) }
		}
	});
	// The page's own render of new ids, flushed here: what the hook throws is thrown to the test, never lost in a microtask.
	return (next: readonly string[]) => flushSync(() => handle?.ask(next));
}

const lines = () =>
	screen.queryAllByTestId(/^public-profile-/u).map((line) => line.textContent?.trim() ?? '');

describe('modules/doctor/ui/public-profiles · useDoctorPublicProfiles', () => {
	it('🔴 Σ1: three doctors ⇒ one (the list ⇒ an appointment below 950) throws nothing and keeps the one', async () => {
		const ask = draw(['doc-a', 'doc-b', 'doc-c']);
		await waitFor(() =>
			expect(lines()).toEqual(['Άννα Αλεξίου', 'Βασίλης Βλάχος', 'Γιώργος Γεωργίου'])
		);
		expect(() => ask(['doc-b'])).not.toThrow();
		await waitFor(() => expect(lines()).toEqual(['Βασίλης Βλάχος']));
	});

	it('🔴 Σ1: three doctors ⇒ none (a tab whose list is still read) ⇒ four, and back to one: never a throw, every line its own', async () => {
		const ask = draw(['doc-a', 'doc-b', 'doc-c']);
		await waitFor(() => expect(lines()).toHaveLength(3));
		await waitFor(() => expect(lines()).not.toContain('waiting'));
		expect(() => ask([])).not.toThrow();
		expect(lines()).toEqual([]);
		expect(() => ask(['doc-d', 'doc-c', 'doc-b', 'doc-a'])).not.toThrow();
		await waitFor(() =>
			expect(lines()).toEqual([
				'Δήμητρα Δούκα',
				'Γιώργος Γεωργίου',
				'Βασίλης Βλάχος',
				'Άννα Αλεξίου'
			])
		);
		expect(() => ask(['doc-c'])).not.toThrow();
		await waitFor(() => expect(lines()).toEqual(['Γιώργος Γεωργίου']));
		expect(() => ask(['doc-a', 'doc-c'])).not.toThrow();
		await waitFor(() => expect(lines()).toEqual(['Άννα Αλεξίου', 'Γιώργος Γεωργίου']));
	});

	it('one read per doctor, kept in the cache: a doctor asked again is never read again (D-W4-29)', async () => {
		const ask = draw(['doc-a', 'doc-b', 'doc-c']);
		await waitFor(() => expect(lines()).not.toContain('waiting'));
		ask(['doc-a']);
		ask(['doc-a', 'doc-b', 'doc-c']);
		await waitFor(() => expect(lines()).toHaveLength(3));
		expect(lines()).not.toContain('waiting');
		expect([...asked].sort()).toEqual(['doc-a', 'doc-b', 'doc-c']);
	});

	it('a doctor nobody may see is `null` (the card leaves the line out), the others their names', async () => {
		draw(['doc-a', 'doc-x']);
		await waitFor(() => expect(lines()).toEqual(['Άννα Αλεξίου', 'none']));
	});

	it('(negative) not enabled (a guest) reads nobody', async () => {
		draw(['doc-a', 'doc-b'], false);
		await Promise.resolve();
		expect(lines()).toEqual(['waiting', 'waiting']);
		expect(asked).toEqual([]);
	});
});
