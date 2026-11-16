import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { notificationInboxKey, notificationInboxSideKey, refreshNotificationInboxSide } from '.';

describe('shared/lib/notification-inbox', () => {
	it('D-W51-81: one prefix per side, both under the list’s root', () => {
		expect(notificationInboxKey).toEqual(['notifications', 'inbox']);
		expect(notificationInboxSideKey('doctor')).toEqual(['notifications', 'inbox', 'doctor']);
		expect(notificationInboxSideKey('patient')).toEqual(['notifications', 'inbox', 'patient']);
	});

	it('U-200.1 · D-W51-91: a doctor’s answer asks the doctor’s side again — its count and its lists — never the patient’s', () => {
		const client = new QueryClient();
		const keys = [
			['notifications', 'inbox', 'doctor', 'unread'],
			['notifications', 'inbox', 'doctor', 'list', 'new', 'el'],
			['notifications', 'inbox', 'patient', 'unread'],
			['notifications', 'inbox', 'patient', 'list', 'all', 'el']
		];
		for (const key of keys) client.setQueryData(key, 1);
		refreshNotificationInboxSide(client, 'doctor');
		const stale = keys.map((key) => client.getQueryState(key)?.isInvalidated);
		expect(stale).toEqual([true, true, false, false]);
	});
});
