import { describe, expect, it } from 'vitest';
import { conversationPath, isConversationId } from '.';

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
