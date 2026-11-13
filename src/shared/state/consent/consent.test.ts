import { afterEach, describe, expect, it } from 'vitest';
import { consentStorageKey } from '$shared/config/env';
import { ConsentDecision } from './consent.svelte';

const kept = { registryVersion: '2.0.0', choices: { 'edoctor-api': true, 'web-analytics': false } };

afterEach(() => window.localStorage.clear());

describe('shared/state/consent · the ONE tracking decision of the page tree (wave 4.5, screen 62)', () => {
	it('nothing is known until the browser’s storage is read: no decision, and not «loaded»', () => {
		window.localStorage.setItem(consentStorageKey, JSON.stringify(kept));
		const decision = new ConsentDecision();
		expect(decision.loaded).toBe(false);
		expect(decision.snapshot).toBeNull();
		decision.load();
		expect(decision.loaded).toBe(true);
		expect(decision.snapshot).toEqual(kept);
	});

	it('the storage is read ONCE: a later `load` does not take back what a surface saved meanwhile', () => {
		const decision = new ConsentDecision();
		decision.load();
		expect(decision.snapshot).toBeNull();
		window.localStorage.setItem(consentStorageKey, JSON.stringify(kept));
		decision.load();
		expect(decision.snapshot).toBeNull();
	});

	it('a saved decision is kept in the browser’s own storage and shown at once', () => {
		const decision = new ConsentDecision();
		decision.save(kept);
		expect(decision.snapshot).toEqual(kept);
		expect(decision.loaded).toBe(true);
		expect(JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null')).toEqual(kept);
	});

	it('(negative) a stored value that is not a decision — corrupt, another shape, markup — reads as none', () => {
		for (const value of ['{', '"x"', '[]', JSON.stringify({ registryVersion: '', choices: {} })]) {
			window.localStorage.setItem(consentStorageKey, value);
			const decision = new ConsentDecision();
			decision.load();
			expect(decision.snapshot, value).toBeNull();
		}
	});
});
