import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toSessionFacts } from './self';

const member = {
	signedIn: true as const,
	hasPatientProfile: true,
	firstName: 'Μαρία',
	lastName: 'Παππά',
	accountKey: 'u',
	maskedLoginPhone: null,
	maskedAmka: null,
	maskedAfm: null
};

describe('auth::ui::host::lib::self', () => {
	// Rewrites «U-65.6: the sign-in address stays only as its mask» by D-W45-10 (wave 4.5): the mask is the server's.
	it('🔴 U-168: το web δεν κρύβει μόνο του email — δείχνει ό,τι στέλνει ο server', () => {
		const facts = toSessionFacts({ ...member, maskedLoginEmail: 'm***a@example.test' });
		expect(facts).toEqual({ ...member, maskedLoginEmail: 'm***a@example.test' });
		// A mask of another shape than the page's old one stays as it came: nothing is worked out here.
		expect(
			toSessionFacts({ ...member, maskedLoginEmail: 'ma***@example.test' }).signedIn &&
				toSessionFacts({ ...member, maskedLoginEmail: 'ma***@example.test' })
		).toMatchObject({ maskedLoginEmail: 'ma***@example.test' });
	});

	it('🔴 U-168 (the source): neither the session’s read nor what the page keeps of it calls a mask of the page’s own', () => {
		for (const path of [
			'src/modules/auth/ui/host/lib/self.ts',
			'src/modules/auth/api/session/index.ts'
		]) {
			const source = readFileSync(resolve(process.cwd(), path), 'utf8');
			expect(source, path).not.toMatch(/maskEmail|maskPhone|maskIdentifier|lib\/masks/u);
			expect(source, path).not.toMatch(/\bloginEmail\b(?!Masked)/u);
		}
	});

	it('no address, no mask; a guest stays a guest', () => {
		expect(toSessionFacts({ ...member, maskedLoginEmail: null })).toEqual({
			...member,
			maskedLoginEmail: null
		});
		expect(toSessionFacts({ signedIn: false })).toEqual({ signedIn: false });
	});
});
