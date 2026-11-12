import { describe, expect, it } from 'vitest';
import { newRelativePath, profilePath, readProfileAddress, relativePath, relativesPath } from '.';

const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

describe('modules/profile/lib/paths · screen 55’s addresses (D-W4-20)', () => {
	it('the application’s words, each read back by the route’s closed list', () => {
		expect(profilePath).toBe('/profile');
		expect(relativesPath).toBe('/profile/relatives');
		expect(newRelativePath).toBe('/profile/relatives/new');
		expect(relativePath(ID)).toBe(`/profile/relatives/${ID}`);
		const rest = (path: string) => path.replace(/^\/profile\/?/u, '');
		expect(readProfileAddress(rest(relativesPath))).toEqual({ view: 'relatives' });
		expect(readProfileAddress(rest(newRelativePath))).toEqual({ view: 'relative-new' });
		expect(readProfileAddress(rest(relativePath(ID)))).toEqual({
			view: 'relative-edit',
			relativeId: ID
		});
	});

	it('🔴 U-65.6 (negative): an id is encoded, never a path of its own', () => {
		expect(relativePath('../admin')).toBe('/profile/relatives/..%2Fadmin');
		expect(relativePath('a?b#c')).toBe('/profile/relatives/a%3Fb%23c');
	});
});
