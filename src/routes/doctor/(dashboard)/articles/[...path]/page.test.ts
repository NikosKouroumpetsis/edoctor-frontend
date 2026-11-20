import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193d000-0000-7000-8000-0000000000b5';

const run = (path: string) => load({ params: { path } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/articles/[...path] load (D-W52-102 / 103, screen 85)', () => {
	it('D-W52-102 / 103: the list, «Νέο άρθρο» and one article', () => {
		expect(run('')).toEqual({ address: { view: 'list' } });
		expect(run('new')).toEqual({ address: { view: 'new' } });
		expect(run(ID)).toEqual({ address: { view: 'article', articleId: ID } });
	});

	it('🔴 D-W52-102 / U-65.6 (negative): anything out of the closed list is a 404 — never a page that reads it', () => {
		for (const path of ['x', `${ID}/x`, 'New', '%3Cscript%3E', `${ID}/submission`])
			expect(thrown(() => run(path)).status, path).toBe(404);
	});
});
