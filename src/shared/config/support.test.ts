import { afterEach, describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/public';
import { getSupportEmail } from './support';

afterEach(() => {
	delete env.PUBLIC_SUPPORT_EMAIL;
});

describe('getSupportEmail', () => {
	it('falls back to the platform mailbox when the setting is missing', () => {
		expect(getSupportEmail()).toBe('support@edoctor.gr');
	});

	it.each(['', '   '])('falls back to the platform mailbox for the blank value %j', (value) => {
		env.PUBLIC_SUPPORT_EMAIL = value;
		expect(getSupportEmail()).toBe('support@edoctor.gr');
	});

	it('returns the configured mailbox without surrounding spaces', () => {
		env.PUBLIC_SUPPORT_EMAIL = '  help@example.gr ';
		expect(getSupportEmail()).toBe('help@example.gr');
	});

	it.each([
		'not-an-email',
		'help@localhost',
		'help me@example.gr',
		'help@example.gr?cc=other@example.gr',
		'help@example.gr,other@example.gr',
		'help%3Fcc@example.gr',
		'<help@example.gr>'
	])('rejects the malformed value %j and falls back', (value) => {
		env.PUBLIC_SUPPORT_EMAIL = value;
		expect(getSupportEmail()).toBe('support@edoctor.gr');
	});
});
