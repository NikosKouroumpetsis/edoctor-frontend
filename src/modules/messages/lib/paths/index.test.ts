import { describe, expect, it } from 'vitest';
import {
	conversationPath,
	doctorConversationPath,
	doctorMessagesArchivePath,
	doctorNewConversationPath,
	doctorNewConversationSearch,
	isConversationId,
	isMessagesPage,
	readDoctorMessagesAddress
} from '.';

describe('the messages’ addresses', () => {
	it('an id passes', () => {
		expect(isConversationId('018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f')).toBe(true);
	});

	it.each([
		'archive',
		'1',
		"'; DROP",
		'<script>',
		'../../etc',
		'018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5fx'
	])('🔴 U-65.6 (negative): %s is no conversation', (value) => {
		expect(isConversationId(value)).toBe(false);
	});

	it('the address carries the id alone', () => {
		expect(conversationPath('abc')).toBe('/messages/abc');
		expect(conversationPath('a/b')).toBe('/messages/a%2Fb');
	});
});

describe('the doctor’s messages (D-W51-85 · D-W51-87)', () => {
	const ID = '018f3c1e-7a2b-7c3d-8e4f-0a1b2c3d4e5f';
	const read = (rest: string, search = '') =>
		readDoctorMessagesAddress(rest, new URLSearchParams(search));

	it('D-W51-85: the list, the archive, a conversation; U-193.1: a conversation the doctor starts with an account or a relative', () => {
		expect(read('')).toEqual({ view: 'list' });
		expect(readDoctorMessagesAddress(undefined, new URLSearchParams())).toEqual({ view: 'list' });
		expect(read('archive')).toEqual({ view: 'archive' });
		expect(read(ID)).toEqual({ view: 'conversation', conversationId: ID });
		expect(read('new', `kind=account&id=${ID}`)).toEqual({
			view: 'new',
			target: { kind: 'account', id: ID }
		});
		expect(read('new', `kind=relative&id=${ID}`)).toEqual({
			view: 'new',
			target: { kind: 'relative', id: ID }
		});
	});

	it.each([
		['new', ''],
		['new', `kind=record&id=${ID}`],
		['new', `kind=Account&id=${ID}`],
		['new', 'kind=account&id=<script>'],
		['new', 'kind=account&id=../x'],
		['archive/x', ''],
		[`${ID}/x`, ''],
		['news', ''],
		['1', '']
	])('🔴 D-W51-71 / U-65.6 (negative): `%s?%s` is no page', (rest, search) => {
		expect(read(rest, search)).toBeUndefined();
	});

	it('the doctor’s addresses carry ids and closed words alone', () => {
		expect(doctorConversationPath('a/b')).toBe('/doctor/messages/a%2Fb');
		expect(doctorNewConversationPath).toBe('/doctor/messages/new');
		expect(doctorNewConversationSearch({ kind: 'relative', id: ID })).toBe(
			`?kind=relative&id=${ID}`
		);
		expect(doctorMessagesArchivePath).toBe('/doctor/messages/archive');
	});

	it('U-84.7: the messages’ pages of either mode, never a look-alike word', () => {
		for (const path of [
			'/messages',
			'/messages/archive',
			'/doctor/messages',
			`/doctor/messages/${ID}`
		]) {
			expect(isMessagesPage(path), path).toBe(true);
		}
		for (const path of ['/messagesx', '/doctor/messagesx', '/doctor', '/']) {
			expect(isMessagesPage(path), path).toBe(false);
		}
	});
});
