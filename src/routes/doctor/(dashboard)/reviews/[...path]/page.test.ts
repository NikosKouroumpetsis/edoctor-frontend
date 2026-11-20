import { describe, expect, it } from 'vitest';
import { load } from './+page';

const ID = '0193d000-0000-7000-8000-0000000000c4';

const run = (path: string, search = '') =>
	load({ params: { path }, url: new URL(`https://edoctor.test/doctor/reviews${search}`) } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/(dashboard)/reviews/[...path] load (D-W52-91 / 92, screen 84)', () => {
	it('D-W52-91 / 92: the list with its choice and the review it goes to, the reply to one review and its report', () => {
		expect(run('')).toEqual({ address: { view: 'list', filter: 'all', reviewId: null } });
		expect(run('', '?filter=unanswered')).toEqual({
			address: { view: 'list', filter: 'unanswered', reviewId: null }
		});
		expect(run('', `?review=${ID}`)).toEqual({
			address: { view: 'list', filter: 'all', reviewId: ID }
		});
		expect(run(`${ID}/reply`)).toEqual({ address: { view: 'reply', reviewId: ID } });
		expect(run(`${ID}/report`)).toEqual({ address: { view: 'report', reviewId: ID } });
	});

	it('🔴 D-W52-91 / U-65.6 (negative): a choice or a review out of the closed words reads none — never a word of its own', () => {
		expect(run('', '?filter=<script>&review=1')).toEqual({
			address: { view: 'list', filter: 'all', reviewId: null }
		});
		expect(run('', '?review=%3Cimg%20src%3Dx%3E')).toMatchObject({ address: { reviewId: null } });
	});

	it('🔴 D-W52-92 / U-65.6 (negative): anything out of the closed list is a 404 — never a page that reads it', () => {
		for (const path of [
			ID,
			`${ID}/x`,
			`${ID}/reply/x`,
			`${ID}/delete`,
			'1/reply',
			`reply/${ID}`,
			'%3Cscript%3E/reply'
		]) {
			expect(thrown(() => run(path)).status, path).toBe(404);
		}
	});
});
