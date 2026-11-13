import { afterEach, describe, expect, it } from 'vitest';
import { followPageLocale } from './document-locale';

afterEach(() => {
	document.documentElement.removeAttribute('lang');
	document.documentElement.removeAttribute('dir');
});

describe('shared/preferences/i18n · the document follows the page’s language (🔴 D-W45-57 β)', () => {
	it('D-W45-57: `<html lang dir>` take the page’s language — Greek, then English, then Greek again', () => {
		document.documentElement.lang = 'el';
		followPageLocale('en');
		expect(document.documentElement).toHaveAttribute('lang', 'en');
		expect(document.documentElement).toHaveAttribute('dir', 'ltr');
		followPageLocale('el');
		expect(document.documentElement).toHaveAttribute('lang', 'el');
		expect(document.documentElement).toHaveAttribute('dir', 'ltr');
	});

	it('(negative) writes only the root it is given, and nothing when the language already holds', () => {
		const root = document.createElement('html');
		root.lang = 'en';
		root.dir = 'ltr';
		const observer = new MutationObserver(() => undefined);
		observer.observe(root, { attributes: true });
		followPageLocale('en', root);
		expect(observer.takeRecords()).toEqual([]);
		followPageLocale('el', root);
		expect(observer.takeRecords().map((record) => record.attributeName)).toEqual(['lang']);
		observer.disconnect();
		expect(root.lang).toBe('el');
		expect(document.documentElement).not.toHaveAttribute('lang');
	});
});
