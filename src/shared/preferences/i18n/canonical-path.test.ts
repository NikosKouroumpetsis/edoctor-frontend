import { describe, expect, it } from 'vitest';
import { canonicalGreekPath } from './canonical-path';

describe('shared/preferences/i18n · the Greek canonical path (🔴 D-W3-38)', () => {
	it('`/el` is the home, `/el/…` the same page at `/…`', () => {
		expect(canonicalGreekPath('/el')).toBe('/');
		expect(canonicalGreekPath('/el/')).toBe('/');
		expect(canonicalGreekPath('/el/doctors/x')).toBe('/doctors/x');
	});

	it('(negative) never a second host: slashes and backslashes after `/el` collapse into ONE leading `/`', () => {
		for (const pathname of ['/el//evil.example', '/el/\\evil.example', '/el///\\/evil.example']) {
			const path = canonicalGreekPath(pathname);
			expect(path, pathname).toBe('/evil.example');
			expect(new URL(path ?? '', 'https://edoctor.invalid').origin).toBe('https://edoctor.invalid');
		}
		// An encoded slash is no slash to a browser: it stays a path of this site.
		const encoded = canonicalGreekPath('/el/%2F%2Fevil.example');
		expect(encoded).toBe('/%2F%2Fevil.example');
		expect(new URL(encoded ?? '', 'https://edoctor.invalid').origin).toBe(
			'https://edoctor.invalid'
		);
	});

	it('an address outside `/el` is none of its business', () => {
		expect(canonicalGreekPath('/')).toBeNull();
		expect(canonicalGreekPath('/en/doctors')).toBeNull();
		expect(canonicalGreekPath('/elena')).toBeNull();
	});
});
