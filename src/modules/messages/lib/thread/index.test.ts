import { describe, expect, it } from 'vitest';
import { buildThreadRows, type ThreadEntry } from '.';

const entry = (key: string, mine: boolean, at: number): ThreadEntry => ({
	key,
	id: key,
	body: key,
	mine,
	at,
	status: 'sent'
});
const noon = Date.UTC(2026, 10, 3, 10);
const minute = 60_000;

describe('the rows of a conversation (U-84 Π2)', () => {
	it('one side within 5΄ is one group; past it, or the other side, another', () => {
		const rows = buildThreadRows([
			entry('a', true, noon),
			entry('b', true, noon + 4 * minute),
			entry('c', true, noon + 10 * minute),
			entry('d', false, noon + 11 * minute)
		]);
		expect(
			rows.map((row) => (row.kind === 'group' ? row.entries.map((e) => e.key) : 'day'))
		).toEqual(['day', ['a', 'b'], ['c'], ['d']]);
	});

	it('a new day has its label, and a group never crosses it', () => {
		const lateNight = Date.UTC(2026, 10, 2, 21, 58); // 23:58 in Athens
		const rows = buildThreadRows([
			entry('a', true, lateNight),
			entry('b', true, lateNight + 4 * minute)
		]);
		expect(rows.map((row) => row.kind)).toEqual(['day', 'group', 'day', 'group']);
	});

	it('a day that comes back (a device’s clock behind the server’s): each label its own key', () => {
		const today = Date.UTC(2026, 10, 3, 10);
		const yesterday = Date.UTC(2026, 10, 2, 10);
		const rows = buildThreadRows([
			entry('a', true, yesterday),
			entry('b', true, today),
			entry('c', true, yesterday)
		]);
		const keys = rows.map((row) => row.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('no messages, no rows', () => {
		expect(buildThreadRows([])).toEqual([]);
	});
});
