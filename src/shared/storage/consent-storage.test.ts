import { afterEach, describe, expect, it, vi } from 'vitest';
import { consentRecordedStorageKey, consentStorageKey } from '$shared/config/env';
import {
	consentDecisionKey,
	forgetRecordedConsent,
	readConsentSnapshot,
	readRecordedConsent,
	sanitizeConsentSnapshot,
	writeConsentSnapshot,
	writeRecordedConsent
} from './consent-storage';

afterEach(() => {
	window.localStorage.clear();
	vi.restoreAllMocks();
});

describe('the recorded decision (R-4)', () => {
	const decision = { registryVersion: '1.1.0', choices: { 'edoctor-api': true, analytics: false } };

	it('keeps the version and the choice and nothing else, under its own key; a sign-out forgets it', () => {
		writeRecordedConsent(decision);
		expect(consentRecordedStorageKey).toMatch(/^edoctor\.[a-z]+\.consent-recorded\.v1$/u);
		expect(JSON.parse(window.localStorage.getItem(consentRecordedStorageKey) ?? 'null')).toEqual(
			decision
		);
		expect(readRecordedConsent()).toEqual(decision);
		forgetRecordedConsent();
		expect(readRecordedConsent()).toBeNull();
	});

	it('(negative) a value not written here is no decision', () => {
		for (const value of [
			'<script>',
			'1.1.0',
			JSON.stringify({ registryVersion: '<script>', choices: {} })
		]) {
			window.localStorage.setItem(consentRecordedStorageKey, value);
			expect(readRecordedConsent(), value).toBeNull();
		}
	});

	it('the same version and choices are one decision, in any order; another choice or version is another', () => {
		const key = consentDecisionKey(decision);
		expect(
			consentDecisionKey({
				registryVersion: '1.1.0',
				choices: { analytics: false, 'edoctor-api': true }
			})
		).toBe(key);
		expect(
			consentDecisionKey({ ...decision, choices: { ...decision.choices, analytics: true } })
		).not.toBe(key);
		expect(consentDecisionKey({ ...decision, registryVersion: '1.2.0' })).not.toBe(key);
	});

	it('(negative) a browser that blocks storage throws nothing', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() => writeRecordedConsent(decision)).not.toThrow();
		expect(() => forgetRecordedConsent()).not.toThrow();
		expect(readRecordedConsent()).toBeNull();
	});
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
