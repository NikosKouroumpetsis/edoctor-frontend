import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193d000-0000-7000-8000-0000000000b3';

const run = (path: string) => load({ params: { path } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/patients/[...path] load (D-W51-73, screen 73)', () => {
	it('D-W51-73: the list, one card of each kind, and a record’s «Στοιχεία ασθενή» and join', () => {
		expect(run('')).toEqual({ address: { view: 'list' } });
		expect(run(`account/${ID}`)).toEqual({
			address: { view: 'card', key: { kind: 'account', id: ID }, step: null }
		});
		expect(run(`relative/${ID}`)).toMatchObject({ address: { key: { kind: 'relative' } } });
		expect(run(`record/${ID}/edit`)).toMatchObject({ address: { step: 'edit' } });
		expect(run(`record/${ID}/merge`)).toMatchObject({ address: { step: 'merge' } });
	});

	it('🔴 D-W51-73 / U-65.6 (negative): anything out of the closed list is a 404 — never a page that reads it', () => {
		for (const path of [
			`doctor/${ID}`,
			'account/1',
			`account/${ID}/edit`,
			`record/${ID}/x`,
			`record/${ID}/edit/x`,
			'%3Cscript%3E'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});
});
