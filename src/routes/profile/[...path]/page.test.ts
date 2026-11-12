import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

const run = (path: string) => load({ params: { path } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/profile/[...path] load (D-W4-20, D-W4-51)', () => {
	it('D-W4-51: `/profile` is still the «Προφίλ» tab (U-81.1)', () => {
		expect(run('')).toEqual({ address: { view: 'tab' } });
	});

	it('D-W4-20: «Οι συγγενείς μου», «Νέος συγγενής» and one relative’s form, the application’s words', () => {
		expect(run('relatives')).toEqual({ address: { view: 'relatives' } });
		expect(run('relatives/new')).toEqual({ address: { view: 'relative-new' } });
		expect(run(`relatives/${ID}`)).toEqual({
			address: { view: 'relative-edit', relativeId: ID }
		});
	});

	it('D-W4-20 / U-65.6 (negative): anything out of the list is a 404 — another word, no id, one level too deep, a path out, a trailing slash, a very long value', () => {
		for (const path of [
			'/',
			'settings',
			'relative',
			'Relatives',
			'relatives/',
			'relatives/edit',
			'relatives/NEW',
			'relatives/1',
			`relatives/${ID}x`,
			`relatives/${ID}/edit`,
			'relatives/new/x',
			'relatives/../relatives',
			'../admin',
			`relatives/<script>`,
			`relatives/${'a'.repeat(4096)}`
		]) {
			expect(
				thrown(() => run(path)),
				path
			).toMatchObject({ status: 404 });
		}
	});

	it('review w4-w1 R1 NIT-4: the router hands the load a DECODED rest (SvelteKit `decodeURIComponent`) — an encoded slash opens the same closed form, never free text', () => {
		expect(run(decodeURIComponent(`relatives%2F${ID}`))).toEqual(run(`relatives/${ID}`));
		expect(thrown(() => run(decodeURIComponent(`relatives%2F${ID}%2Fedit`)))).toMatchObject({
			status: 404
		});
	});
});
