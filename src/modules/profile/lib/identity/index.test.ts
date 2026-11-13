import { describe, expect, it } from 'vitest';
import { buildProfileIdentity } from '.';

const EMAIL = 'e***a@example.gr';
const PHONE = '+30 69•• ••• 678';

describe('modules/profile/lib/identity · the name card of the «Προφίλ» (D-W45-18)', () => {
	it('🔴 D-W45-18: the initial, «Όνομα Επώνυμο» and under it the sign-in address as the server hides it', () => {
		expect(
			buildProfileIdentity({
				firstName: 'Ελένη',
				lastName: 'Παππά',
				maskedLoginEmail: EMAIL,
				maskedLoginPhone: PHONE
			})
		).toEqual({ initial: 'Ε', title: 'Ελένη Παππά', line: EMAIL });
	});

	it('D-W45-18: without an address the mobile, hidden the same way; without either no second line', () => {
		expect(
			buildProfileIdentity({
				firstName: 'Ελένη',
				lastName: 'Παππά',
				maskedLoginEmail: null,
				maskedLoginPhone: PHONE
			})
		).toEqual({ initial: 'Ε', title: 'Ελένη Παππά', line: PHONE });
		expect(buildProfileIdentity({ firstName: 'Ελένη', lastName: 'Παππά' })).toEqual({
			initial: 'Ε',
			title: 'Ελένη Παππά',
			line: null
		});
	});

	it('D-W45-18: without a name (no patient’s profile) no initial — a person’s glyph — and the hidden address or mobile as the ONE line', () => {
		expect(
			buildProfileIdentity({ firstName: null, lastName: '  ', maskedLoginEmail: EMAIL })
		).toEqual({ initial: null, title: EMAIL, line: null });
		expect(buildProfileIdentity({ firstName: null, maskedLoginPhone: PHONE })).toEqual({
			initial: null,
			title: PHONE,
			line: null
		});
	});

	it('one name alone is the name; the initial is its first letter, upper case, a whole character', () => {
		expect(buildProfileIdentity({ firstName: ' άννα ', lastName: null })).toMatchObject({
			initial: 'Ά',
			title: 'άννα'
		});
		expect(buildProfileIdentity({ firstName: null, lastName: 'Παππά' })).toMatchObject({
			initial: 'Π',
			title: 'Παππά'
		});
		expect(buildProfileIdentity({ firstName: '😀 Άννα' })?.initial).toBe('😀');
	});

	it('(negative) nobody — a guest — is no card; an account the server names NOTHING for (`null` from `GET /patient/me`) is the person’s glyph alone, no line, as in the application', () => {
		expect(buildProfileIdentity(null)).toBeNull();
		expect(buildProfileIdentity(undefined)).toBeNull();
		const bare = { initial: null, title: null, line: null };
		expect(buildProfileIdentity({ firstName: null })).toEqual(bare);
		expect(buildProfileIdentity({ firstName: ' ', lastName: '', maskedLoginEmail: ' ' })).toEqual(
			bare
		);
	});

	it('🔴 U-168 (negative): nothing is hidden here — what the session holds is printed as it is, never re-masked', () => {
		const shape = 'el***@example.gr';
		expect(buildProfileIdentity({ firstName: 'Ελένη', maskedLoginEmail: shape })?.line).toBe(shape);
	});
});
