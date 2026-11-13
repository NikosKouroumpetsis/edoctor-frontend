import { describe, expect, it } from 'vitest';
import { load } from './+page';

const run = (search: string) =>
	load({ url: new URL(`https://edoctor.test/notifications${search}`) } as never);

describe('routes/notifications load (D-W45-49)', () => {
	it('D-W45-49: `/notifications` names no choice — the page opens on its own («Νέες» while something is new, else «Όλες»)', () => {
		expect(run('')).toEqual({ address: { filter: null } });
	});

	it('🔴 U-174: τρεις επιλογές — each of the three is the address’s `?filter=`, so a reload, «back» and a copied link agree', () => {
		expect(run('?filter=new')).toEqual({ address: { filter: 'new' } });
		expect(run('?filter=previous')).toEqual({ address: { filter: 'previous' } });
		expect(run('?filter=all')).toEqual({ address: { filter: 'all' } });
	});

	it('🔴 U-65.6 (negative): nothing else of the address is kept — another word, markup, an id, a long value; the page is never refused for it, and the data holds the choice alone', () => {
		for (const search of [
			'?filter=old',
			'?filter=NEW',
			'?filter=%3Cimg%20src%3Dx%3E',
			'?filter=018f3c1e-0000-7000-8000-000000000001',
			`?filter=${'a'.repeat(4000)}`,
			'?id=018f3c1e-0000-7000-8000-000000000001',
			'?filter=new%00',
			'?cursor=abc&lang=en&limit=500'
		]) {
			expect(run(search), search).toEqual({ address: { filter: null } });
		}
		expect(Object.keys(run('?filter=all&cursor=abc&id=1') as object)).toEqual(['address']);
		expect(run('?filter=all&cursor=abc&id=1')).toEqual({ address: { filter: 'all' } });
	});
});
