import { afterEach, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/public';
import { getSiteOrigin, siteUrl } from './site';

afterEach(() => {
	delete env.PUBLIC_SITE_ORIGIN;
});

describe('getSiteOrigin', () => {
	it('MINOR-5 of r1: falls back to the platform’s site when the setting is missing or blank', () => {
		expect(getSiteOrigin()).toBe('https://edoctor.gr');
		env.PUBLIC_SITE_ORIGIN = '   ';
		expect(getSiteOrigin()).toBe('https://edoctor.gr');
	});

	it('MINOR-5 of r1: returns the configured bare origin, without spaces or trailing slashes', () => {
		env.PUBLIC_SITE_ORIGIN = ' https://web.example/ ';
		expect(getSiteOrigin()).toBe('https://web.example');
		env.PUBLIC_SITE_ORIGIN = 'http://localhost:5173';
		expect(getSiteOrigin()).toBe('http://localhost:5173');
	});

	it.each([
		'javascript:alert(1)',
		'ftp://web.example',
		'web.example',
		'https://web.example/path',
		'https://web.example?x=1',
		'https://user@web.example',
		'https://web.example#top',
		'https://web example'
	])(
		'MINOR-5 of r1: rejects the value %j that is no bare http(s) origin and falls back',
		(value) => {
			env.PUBLIC_SITE_ORIGIN = value;
			expect(getSiteOrigin()).toBe('https://edoctor.gr');
		}
	);
});

describe('siteUrl', () => {
	it('MINOR-5 of r1: an absolute address on the site’s origin — never `..`, never another host', () => {
		env.PUBLIC_SITE_ORIGIN = 'https://web.example';
		expect(siteUrl('/doctors/dr-athena')).toBe('https://web.example/doctors/dr-athena');
		expect(siteUrl('../doctors/dr-athena')).toBe('https://web.example/doctors/dr-athena');
		expect(siteUrl('/en/doctors/dr-athena?office=2')).toBe(
			'https://web.example/en/doctors/dr-athena?office=2'
		);
		expect(siteUrl('http://localhost:5173/doctors/dr-athena')).toBe(
			'https://web.example/doctors/dr-athena'
		);
		expect(siteUrl('//evil.example/doctors/x')).toBe('https://web.example/doctors/x');
	});
});
