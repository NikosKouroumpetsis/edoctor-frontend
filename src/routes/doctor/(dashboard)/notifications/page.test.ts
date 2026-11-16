import { describe, expect, it } from 'vitest';
import { load } from './+page';

const run = (search: string) =>
	load({ url: new URL(`https://edoctor.test/doctor/notifications${search}`) } as never);

describe('routes/doctor/(dashboard)/notifications load (D-W51-89)', () => {
	it('D-W51-89: `/doctor/notifications` names no choice — the page opens on its own; each of the three is the address’s `?filter=`', () => {
		expect(run('')).toEqual({ address: { filter: null } });
		expect(run('?filter=new')).toEqual({ address: { filter: 'new' } });
		expect(run('?filter=previous')).toEqual({ address: { filter: 'previous' } });
		expect(run('?filter=all')).toEqual({ address: { filter: 'all' } });
	});

	it('🔴 U-65.6 (negative): nothing else of the address is kept — another word, markup, a side asked in the address; the page is never refused for it', () => {
		for (const search of [
			'?filter=old',
			'?filter=%3Cimg%20src%3Dx%3E',
			`?filter=${'a'.repeat(4000)}`,
			'?side=patient',
			'?side=doctor&cursor=abc&limit=500'
		]) {
			expect(run(search), search).toEqual({ address: { filter: null } });
		}
		expect(Object.keys(run('?filter=all&side=patient') as object)).toEqual(['address']);
	});
});
