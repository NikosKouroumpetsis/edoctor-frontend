import { describe, expect, it } from 'vitest';
import { readQueryState } from '.';

describe('shared::lib::query-state', () => {
	it('tells the four states apart, as the application’s `readQueryState`', () => {
		expect(readQueryState({ isPending: true, fetchStatus: 'fetching', isError: false })).toBe(
			'waiting'
		);
		expect(readQueryState({ isPending: false, fetchStatus: 'idle', isError: false })).toBe(
			'answered'
		);
		expect(readQueryState({ isPending: false, fetchStatus: 'idle', isError: true })).toBe('failed');
	});

	it('(negative) a read paused without a network is unavailable, never «answered» nor «waiting»', () => {
		expect(readQueryState({ isPending: true, fetchStatus: 'paused', isError: false })).toBe(
			'unavailable'
		);
		expect(readQueryState({ isPending: true, fetchStatus: 'idle', isError: false })).toBe(
			'unavailable'
		);
	});
});
