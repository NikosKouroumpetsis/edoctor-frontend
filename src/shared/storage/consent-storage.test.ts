import { afterEach, describe, expect, it, vi } from 'vitest';
import { consentStorageKey } from '$shared/config/env';
import {
	readConsentSnapshot,
	sanitizeConsentSnapshot,
	writeConsentSnapshot
} from './consent-storage';

afterEach(() => {
	window.localStorage.clear();
	vi.restoreAllMocks();
});

describe('consent storage', () => {
	it('U-16.5: keeps the decision first-party under `edoctor.<env>.consent.v1`, the version and the choices only', () => {
		writeConsentSnapshot({ registryVersion: '1.0.0', choices: { 'edoctor-api': true } });
		expect(consentStorageKey).toMatch(/^edoctor\.[a-z]+\.consent\.v1$/u);
		expect(JSON.parse(window.localStorage.getItem(consentStorageKey) ?? 'null')).toEqual({
			registryVersion: '1.0.0',
			choices: { 'edoctor-api': true }
		});
		expect(readConsentSnapshot()).toEqual({
			registryVersion: '1.0.0',
			choices: { 'edoctor-api': true }
		});
	});

	it('U-16.5 (negative): a corrupt or foreign value asks again; strange entries are dropped one by one', () => {
		window.localStorage.setItem(consentStorageKey, '{not json');
		expect(readConsentSnapshot()).toBeNull();
		expect(sanitizeConsentSnapshot({ registryVersion: '', choices: {} })).toBeNull();
		expect(sanitizeConsentSnapshot({ registryVersion: '1', choices: [] })).toBeNull();
		expect(
			sanitizeConsentSnapshot({
				registryVersion: '1',
				choices: { 'edoctor-api': true, 'Bad Id': true, analytics: 'yes' }
			})
		).toEqual({ registryVersion: '1', choices: { 'edoctor-api': true } });
	});

	it('U-16.5: a browser that blocks storage throws nothing (the card asks again next visit)', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() =>
			writeConsentSnapshot({ registryVersion: '1', choices: { 'edoctor-api': true } })
		).not.toThrow();
		expect(readConsentSnapshot()).toBeNull();
	});
});
