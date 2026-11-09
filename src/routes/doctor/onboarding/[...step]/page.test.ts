import { describe, expect, it } from 'vitest';
import { load } from './+page';

const run = (step: string) => load({ params: { step } } as never);

function thrown(call: () => unknown): { status?: number } {
	try {
		call();
	} catch (error) {
		return error as { status?: number };
	}
	return {};
}

describe('routes/doctor/onboarding/[...step] load (D-W3-28, P-W3 §3.1)', () => {
	it('D-W3-28: the overview, every step 33–42 and «Ολοκληρώθηκε», and the two screens a step opens (U-102)', () => {
		const pages: [string, string][] = [
			['', 'overview'],
			['stage/1', 'stage-1'],
			['basic', 'basic'],
			['email', 'email'],
			['email/code', 'email-code'],
			['specialty', 'specialty'],
			['specialty/list', 'specialty-list'],
			['stage/2', 'stage-2'],
			['location', 'location'],
			['location/search', 'address-search'],
			['location/confirm', 'address-confirm'],
			['location/pin', 'pin'],
			['office', 'office'],
			['amenities', 'amenities'],
			['payments', 'payments'],
			['price', 'price'],
			['calendar', 'calendar'],
			['stage/3', 'stage-3'],
			['terms', 'terms'],
			['access', 'access'],
			['done', 'done']
		];
		for (const [step, screen] of pages) expect(run(step), step).toEqual({ screen });
	});

	it('D-W3-28 / U-65.6 (negative): anything out of the list is a 404 — a guess, a path out, a stage that is none, a step one level too deep, a trailing slash, another case', () => {
		for (const step of [
			'overview',
			'stage',
			'stage/4',
			'stage/0',
			'basic/x',
			'email/code/again',
			'specialty-list',
			'location/search/x',
			'../admin',
			'location/../basic',
			'basic/',
			'Basic',
			'%3Cscript%3E',
			'done/1'
		]) {
			expect(
				thrown(() => run(step)),
				step
			).toMatchObject({ status: 404 });
		}
	});
});
