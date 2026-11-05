import { describe, expect, it } from 'vitest';
import { toSessionFacts } from './self';

const member = {
	signedIn: true as const,
	hasPatientProfile: true,
	firstName: 'Μαρία',
	accountKey: 'u'
};

describe('auth::ui::host::lib::self', () => {
	it('🔴 U-65.6: the sign-in address stays only as its mask', () => {
		const facts = toSessionFacts({ ...member, loginEmail: 'maria.private@example.test' });
		expect(facts).toEqual({ ...member, maskedLoginEmail: 'm***e@example.test' });
		expect(JSON.stringify(facts)).not.toContain('maria.private');
	});

	it('no address, no mask; a guest stays a guest', () => {
		expect(toSessionFacts({ ...member, loginEmail: null })).toEqual({
			...member,
			maskedLoginEmail: null
		});
		expect(toSessionFacts({ signedIn: false })).toEqual({ signedIn: false });
	});
});
