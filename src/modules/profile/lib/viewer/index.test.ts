import { describe, expect, it } from 'vitest';
import { profileViewerOf } from '.';

const session = (status: 'unknown' | 'guest' | 'member', readFailed = false) => ({
	status,
	isMember: status === 'member',
	readFailed
});

describe('modules/profile/lib/viewer', () => {
	it('U-80.1 Ε6: until the browser has asked the session it is the wait — never a guest’s page that changes a moment later', () => {
		expect(profileViewerOf(session('unknown'))).toBe('waiting');
		expect(profileViewerOf(session('guest'))).toBe('guest');
		expect(profileViewerOf(session('member'))).toBe('member');
	});

	it('a read that got no answer (an outage) is a guest’s, and so is a page with no session at all: nothing waits on', () => {
		expect(profileViewerOf(session('unknown', true))).toBe('guest');
		expect(profileViewerOf(undefined)).toBe('guest');
		// A member whose later read failed is still a member.
		expect(profileViewerOf(session('member', true))).toBe('member');
	});
});
