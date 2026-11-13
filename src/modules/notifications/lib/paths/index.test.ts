import { describe, expect, it } from 'vitest';
import { notificationsPath, notificationsSearch, readNotificationsAddress } from '.';

const read = (search: string) => readNotificationsAddress(new URLSearchParams(search));

describe('modules/notifications/lib/paths · the address of the list (D-W45-49)', () => {
	it('D-W45-49: «Ειδοποιήσεις» lives at `/notifications`, a route of its own (D-W45-01: not under `/profile`)', () => {
		expect(notificationsPath).toBe('/notifications');
	});

	it('🔴 U-174: τρεις επιλογές — each of the three is a word of the address (`?filter=`), as «Ιστορικό» is of the appointments’; read back, it is the same choice', () => {
		expect(notificationsSearch('new')).toBe('?filter=new');
		expect(notificationsSearch('previous')).toBe('?filter=previous');
		expect(notificationsSearch('all')).toBe('?filter=all');
		for (const filter of ['new', 'previous', 'all'] as const) {
			expect(read(notificationsSearch(filter))).toEqual({ filter });
		}
	});

	it('D-W45-49: an address that names no choice is the page’s own to open (`null`: «Νέες» while something is new, else «Όλες»)', () => {
		expect(read('')).toEqual({ filter: null });
		expect(read('?')).toEqual({ filter: null });
		expect(read('?tab=history')).toEqual({ filter: null });
	});

	it('🔴 U-65.6 (negative): a word out of the three is not kept — another word, capitals, the application’s «old», markup, an id, a long value, a list', () => {
		for (const search of [
			'?filter=',
			'?filter=NEW',
			'?filter=old',
			'?filter=unread',
			'?filter=new%20',
			'?filter=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
			'?filter=018f3c1e-0000-7000-8000-000000000001',
			`?filter=${'a'.repeat(5000)}`,
			'?filter[]=new',
			'?FILTER=new',
			'?filter=__proto__',
			'?filter=toString'
		]) {
			expect(read(search), search).toEqual({ filter: null });
		}
		// Told twice, the first word is the address's.
		expect(read('?filter=previous&filter=new')).toEqual({ filter: 'previous' });
		expect(read('?filter=x&filter=new')).toEqual({ filter: null });
	});
});
