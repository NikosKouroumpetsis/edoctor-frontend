import { describe, expect, it } from 'vitest';
import {
	buildLoginHref,
	readLoginParams,
	readProvider,
	readSafeNext,
	readSignInAction,
	sanitizeStoredReturn
} from '.';

describe('auth::lib::return-path (Π4)', () => {
	it('`next` takes a path of this site, with its query and its hash', () => {
		expect(readSafeNext('/doctors/a-pappas')).toBe('/doctors/a-pappas');
		expect(readSafeNext('/en/doctors?what=x#top')).toBe('/en/doctors?what=x#top');
	});

	it('U-65.6 (negative): no open redirect — another host, a scheme, a hidden slash, a control character', () => {
		for (const value of [
			null,
			undefined,
			'',
			'https://evil.example',
			'//evil.example',
			'/\\evil.example',
			'\\\\evil.example',
			'/\t/evil.example',
			'/\n/evil.example',
			'javascript:alert(1)',
			'doctors',
			`/${'a'.repeat(600)}`
		]) {
			expect(readSafeNext(value), String(value)).toBeNull();
		}
	});

	it('S-2 (negative): dots a browser cleans away never leave a second slash at the start', () => {
		for (const value of [
			'/.//evil.com',
			'/..//evil.com',
			'/a/..//evil.com',
			'/././/evil.com',
			'/.//evil.com/doctors?x=1#top'
		]) {
			expect(readSafeNext(value), value).toBeNull();
		}
		expect(buildLoginHref('/login', { next: '/.//evil.com' })).toBe('/login');
		expect(sanitizeStoredReturn({ next: '/..//evil.com', action: null })).toBeNull();
		// A second slash further on stays on this site.
		expect(readSafeNext('/doctors//a')).toBe('/doctors//a');
	});

	it('N-1 (negative): the sign-in page is no way back: a member would stay on it', () => {
		for (const value of ['/login', '/login/', '/en/login', '/el/login', '/login?next=/help']) {
			expect(readSafeNext(value), value).toBeNull();
		}
		expect(readSafeNext('/login-help')).toBe('/login-help');
	});

	it('U-65.6 (negative): `do`, `error` and `via` are closed lists, never free text', () => {
		expect(readSignInAction('book')).toBe('book');
		expect(readSignInAction('<script>')).toBeNull();
		expect(readSignInAction(null)).toBeNull();
		expect(readProvider('apple')).toBe('apple');
		expect(readProvider('google')).toBe('google');
		expect(readProvider('Η σύνδεση απέτυχε')).toBeNull();
	});

	it('reads the address’s parts together, each checked', () => {
		expect(
			readLoginParams(new URLSearchParams('next=/doctors/x&do=fee&error=apple&via=google&other=1'))
		).toEqual({ next: '/doctors/x', action: 'fee', error: 'apple', via: 'google' });
		expect(readLoginParams(new URLSearchParams('next=//evil&do=x&error=y&via=<script>'))).toEqual({
			next: null,
			action: null,
			error: null,
			via: null
		});
	});

	it('the way back from a provider names its door, and nothing else of the visit', () => {
		expect(buildLoginHref('/login', { via: 'apple' })).toBe('/login?via=apple');
		expect(buildLoginHref('/en/login', { next: '/en/help', action: 'fav', via: 'google' })).toBe(
			'/en/login?next=%2Fen%2Fhelp&do=fav&via=google'
		);
	});

	it('builds `/login?next=…&do=…` with only what passes', () => {
		expect(buildLoginHref('/login', {})).toBe('/login');
		expect(buildLoginHref('/en/login', { next: '/en/doctors/x', action: 'book' })).toBe(
			'/en/login?next=%2Fen%2Fdoctors%2Fx&do=book'
		);
		expect(buildLoginHref('/login', { next: '//evil', action: null })).toBe('/login');
	});

	it('U-65.6 (negative): what the tab kept is checked when read back', () => {
		expect(sanitizeStoredReturn({ next: '/a', action: 'fav' })).toEqual({
			next: '/a',
			action: 'fav'
		});
		expect(sanitizeStoredReturn({ next: 'https://evil', action: 'x' })).toBeNull();
		expect(sanitizeStoredReturn('text')).toBeNull();
		expect(sanitizeStoredReturn(null)).toBeNull();
	});
});
