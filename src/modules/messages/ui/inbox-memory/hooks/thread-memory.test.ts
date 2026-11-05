import { describe, expect, it } from 'vitest';
import { ThreadMemory, type LocalMessage } from './thread-memory.svelte';

const unsent = (clientMessageId: string, body = 'Γεια'): LocalMessage => ({
	clientMessageId,
	body,
	at: 1,
	status: 'pending'
});

function memoryOn(conversationId: string) {
	const memory = new ThreadMemory();
	memory.follow(conversationId);
	return memory;
}

describe('ThreadMemory (U-84, R-10)', () => {
	it('another conversation: the field starts empty, and what has not left stays with its own', () => {
		const memory = memoryOn('a');
		memory.draft = 'μισή φράση';
		memory.line = 'γραμμή';
		memory.addLocal(unsent('1'));
		memory.follow('b');
		expect(memory.draft).toBe('');
		expect(memory.line).toBeNull();
		expect(memory.localOf('b')).toEqual([]);
		expect(memory.localOf('a').map((message) => message.clientMessageId)).toEqual(['1']);
	});

	it('🔴 a refusal that arrives elsewhere never reaches the other’s field: a bubble that did not leave, on its own', () => {
		const memory = memoryOn('a');
		memory.addLocal(unsent('1', 'για τον γιατρό Α'));
		memory.follow('b');
		memory.takeBack('1', 'πολλά σε λίγο');
		expect(memory.draft).toBe('');
		expect(memory.line).toBeNull();
		expect(memory.localOf('a')[0].status).toBe('failed');
	});

	it('back on its own conversation a refusal returns the words to the field, as before', () => {
		const memory = memoryOn('a');
		memory.addLocal(unsent('1', 'τα λόγια'));
		memory.takeBack('1', 'γραμμή');
		expect(memory.draft).toBe('τα λόγια');
		expect(memory.line).toBe('γραμμή');
		expect(memory.localOf('a')).toEqual([]);
	});

	it('words written meanwhile stay, and the refused ones stay a bubble: neither is lost', () => {
		const memory = memoryOn('a');
		memory.addLocal(unsent('1', 'τα πρώτα'));
		memory.draft = 'τα νέα';
		memory.takeBack('1', null);
		expect(memory.draft).toBe('τα νέα');
		expect(memory.localOf('a')[0].status).toBe('failed');
	});

	it('an answer finds its message wherever it is, and leaves the others alone', () => {
		const memory = memoryOn('a');
		memory.addLocal(unsent('1'));
		memory.follow('b');
		memory.addLocal(unsent('2'));
		memory.setStatus('1', 'failed');
		expect(memory.localOf('a')[0].status).toBe('failed');
		expect(memory.localOf('b')[0].status).toBe('pending');
		memory.drop('1');
		expect(memory.localOf('a')).toEqual([]);
		expect(memory.localOf('b')).toHaveLength(1);
		memory.takeBack('gone', 'γραμμή');
		expect(memory.line).toBeNull();
	});

	it('🔴 U-65.6: a sign-out takes everything, from every conversation', () => {
		const memory = memoryOn('a');
		memory.draft = 'λόγια';
		memory.addLocal(unsent('1'));
		memory.follow('b');
		memory.addLocal(unsent('2'));
		memory.forget();
		expect(memory.draft).toBe('');
		expect(memory.localOf('a')).toEqual([]);
		expect(memory.localOf('b')).toEqual([]);
	});
});
