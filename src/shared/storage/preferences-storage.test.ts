import { afterEach, describe, expect, it, vi } from 'vitest';
import { preferencesStorageKey } from '$shared/config/env';
import { readPreferencesSnapshot, writePreferencesSnapshot } from './preferences-storage';

const blockedByBrowser = () => {
	throw new DOMException('The operation is insecure.', 'SecurityError');
};

afterEach(() => {
	vi.restoreAllMocks();
	window.localStorage.clear();
});

describe('preferences storage blocked by the browser', () => {
	it('returns the empty snapshot when reading storage throws', () => {
		window.localStorage.setItem(preferencesStorageKey, JSON.stringify({ themePreference: 'dark' }));
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blockedByBrowser);

		expect(readPreferencesSnapshot()).toEqual({});
	});

	it('skips saving without throwing when writing storage throws', () => {
		const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blockedByBrowser);

		expect(() => writePreferencesSnapshot({ themePreference: 'dark' })).not.toThrow();
		expect(setItem).toHaveBeenCalledOnce();
	});
});
