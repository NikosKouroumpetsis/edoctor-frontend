import { describe, expect, it } from 'vitest';
import { buildDirectionsUrl } from './index';

describe('buildDirectionsUrl (U-68.1 Π4)', () => {
	it('the point wins over the address', () => {
		const url = new URL(
			buildDirectionsUrl({
				coordinates: { latitude: 37.97, longitude: 23.73 },
				address: 'Νίκης 12'
			}) ?? ''
		);
		expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/');
		expect(url.searchParams.get('destination')).toBe('37.97,23.73');
	});

	it('without a point, the address, encoded: its words cannot change the link', () => {
		const url = new URL(buildDirectionsUrl({ address: 'Νίκης 12&api=2#x' }) ?? '');
		expect(url.searchParams.get('destination')).toBe('Νίκης 12&api=2#x');
		expect(url.searchParams.get('api')).toBe('1');
		expect(url.hash).toBe('');
	});

	it('with neither, no link', () => {
		expect(buildDirectionsUrl({})).toBeNull();
		expect(buildDirectionsUrl({ address: '   ' })).toBeNull();
	});
});
