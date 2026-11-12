import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { flushSync, type Component } from 'svelte';
import QueryHarness from '$shared/query/query.harness.svelte';
import Harness from './use-office-slots.harness.svelte';

/*
 * 🔴 Live check w4-live-web Σ1, the same reads in the profile's picker: the offices asked change as the page changes
 * (another doctor of the same route, an appointment's ONE office, none). The set shrinks by more than one at once and
 * grows again; nothing may throw, every office keeps its own window, and «Δοκιμάστε ξανά» asks only what failed.
 * Made-up offices, each answering a zone of its own so a window is never taken for another's.
 */

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

const ZONES: Record<string, string> = {
	'off-a': 'Europe/Athens',
	'off-b': 'Europe/Berlin',
	'off-c': 'Europe/Copenhagen',
	'off-d': 'Europe/Dublin'
};

let asked: string[];
let down: Set<string>;

beforeEach(() => {
	asked = [];
	down = new Set();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const officeId = new URL(input).searchParams.get('officeId') ?? '';
			asked.push(officeId);
			if (down.has(officeId)) return json({}, 500);
			return json({ officeId, timezone: ZONES[officeId], slotsByDate: [] });
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function draw(officeIds: string[]) {
	let handle: { ask: (next: string[]) => void; retry: () => void } | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { officeIds, onReady: (found: NonNullable<typeof handle>) => (handle = found) }
		}
	});
	return {
		// The page's own render of new offices, flushed here: what the hook throws is thrown to the test.
		ask: (next: string[]) => flushSync(() => handle?.ask(next)),
		retry: () => handle?.retry()
	};
}

const lines = () =>
	screen.queryAllByTestId(/^office-slots-off-/u).map((line) => line.textContent?.trim() ?? '');
const state = () => screen.getByTestId('office-slots-state').textContent;

describe('modules/doctor/ui/availability-picker · useDoctorOfficeSlots', () => {
	it('🔴 Σ1: three offices ⇒ one (another doctor of the same page) throws nothing and keeps the one’s own window', async () => {
		const page = draw(['off-a', 'off-b', 'off-c']);
		await waitFor(() =>
			expect(lines()).toEqual(['Europe/Athens', 'Europe/Berlin', 'Europe/Copenhagen'])
		);
		expect(state()).toBe('answered');
		expect(() => page.ask(['off-b'])).not.toThrow();
		await waitFor(() => expect(lines()).toEqual(['Europe/Berlin']));
		expect(state()).toBe('answered');
	});

	it('🔴 Σ1: three ⇒ none ⇒ four in another order ⇒ one: never a throw, `idle` with nothing to ask, every window its own office’s', async () => {
		const page = draw(['off-a', 'off-b', 'off-c']);
		await waitFor(() => expect(state()).toBe('answered'));
		expect(() => page.ask([])).not.toThrow();
		expect(lines()).toEqual([]);
		expect(state()).toBe('idle');
		expect(() => page.ask(['off-d', 'off-c', 'off-b', 'off-a'])).not.toThrow();
		await waitFor(() =>
			expect(lines()).toEqual([
				'Europe/Dublin',
				'Europe/Copenhagen',
				'Europe/Berlin',
				'Europe/Athens'
			])
		);
		expect(() => page.ask(['off-c'])).not.toThrow();
		await waitFor(() => expect(lines()).toEqual(['Europe/Copenhagen']));
	});

	it('(negative) one window failed: `failed`, the others answered; «Δοκιμάστε ξανά» asks ONLY the one that failed', async () => {
		down.add('off-b');
		const page = draw(['off-a', 'off-b']);
		await waitFor(() => expect(state()).toBe('failed'));
		expect(lines()).toEqual(['Europe/Athens', 'none']);
		down.clear();
		asked = [];
		page.retry();
		await waitFor(() => expect(state()).toBe('answered'));
		expect(lines()).toEqual(['Europe/Athens', 'Europe/Berlin']);
		expect(asked).toEqual(['off-b']);
	});
});
