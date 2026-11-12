// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { projectRoot } from './source-scan';

/**
 * 🔴 D-W4-57 (the orchestrator, wave 4.0): where the site and the application say the same Greek under the same key,
 * they say the same English — the application's wins (how-we-work §4: same flow, same words). A web key is the
 * application's mechanically (P-W4 §6.1: dots ⇒ `_`, camelCase ⇒ snake_case). Read where the application keeps them
 * (the `color-parity` way): an English that drifts on either side fails here.
 */
type Catalog = Record<string, string>;

const webCatalog = (locale: 'el' | 'en'): Catalog =>
	JSON.parse(readFileSync(resolve(projectRoot, `messages/${locale}.json`), 'utf8')) as Catalog;

/** The one exported catalog object of an application language file, run the way a bundler would. */
function appCatalog(locale: 'el' | 'en'): Catalog {
	const source = readFileSync(
		resolve(projectRoot, `../application/src/shared/preferences/i18n/${locale}/index.ts`),
		'utf8'
	);
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
	});
	const module = { exports: {} as Record<string, unknown> };
	runInNewContext(outputText, { module, exports: module.exports, require: () => ({}) });
	const catalogs = Object.values(module.exports).filter(
		(value): value is Catalog => typeof value === 'object' && value !== null
	);
	if (catalogs.length !== 1) throw new Error(`expected one catalog, found ${catalogs.length}`);
	return catalogs[0];
}

/** `appointments.cancel.then.freed` ⇒ `appointments_cancel_then_freed`, `ratings.form.hint.inDepth` ⇒ `…_in_depth`. */
const webKeyOf = (appKey: string) =>
	appKey
		.split('.')
		.join('_')
		.replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
		.toLowerCase();

/**
 * Review w4-w1 R1 MINOR-1: the frame's words whose web key is not the application's mechanically (U-81.2: below 744 the
 * site IS the application, its tabs and its menu too) — web key ⇒ the application's key it says.
 */
const FRAME_KEYS: Record<string, string> = {
	tab_appointments: 'tabs.appointments',
	tab_favorites: 'tabs.favorites',
	tab_messages: 'tabs.messages',
	tab_profile: 'tabs.profile',
	account_menu_appointments: 'appointments.pageTitle',
	account_menu_relatives: 'profile.menu.relatives'
};

/** The keys of both whose Greek is the same and whose English is not: `web key: web ≠ app`. */
function englishDrift(
	web: { el: Catalog; en: Catalog },
	app: { el: Catalog; en: Catalog },
	aliases: Record<string, string> = {}
): string[] {
	const pairs: [string, string][] = [
		...Object.keys(app.en).map((appKey): [string, string] => [webKeyOf(appKey), appKey]),
		...Object.entries(aliases)
	];
	return pairs.flatMap(([key, appKey]) => {
		if (!Object.hasOwn(web.en, key) || !Object.hasOwn(app.en, appKey)) return [];
		if (web.el[key] !== app.el[appKey]) return [];
		return web.en[key] === app.en[appKey] ? [] : [`${key}: «${web.en[key]}» ≠ «${app.en[appKey]}»`];
	});
}

describe('🔴 D-W4-57 · the same Greek says the same English on the site and in the application', () => {
	it('no key of both drifts in English (the application wins)', () => {
		const web = { el: webCatalog('el'), en: webCatalog('en') };
		const app = { el: appCatalog('el'), en: appCatalog('en') };
		expect(
			Object.keys(app.en).filter((key) => Object.hasOwn(web.en, webKeyOf(key))).length
		).toBeGreaterThan(800);
		expect(englishDrift(web, app, FRAME_KEYS)).toEqual([]);
		expect(web.en.appointments_cancel_then_freed).toBe('The time opens up for other patients.');
	});

	it('review w4-w1 R1 MINOR-1 · U-81.2: the capsule’s tabs and the member’s menu say the application’s English (the 5th tab «Bookings»)', () => {
		const web = { el: webCatalog('el'), en: webCatalog('en') };
		const app = { el: appCatalog('el'), en: appCatalog('en') };
		for (const [key, appKey] of Object.entries(FRAME_KEYS)) {
			expect(web.el[key], key).toBe(app.el[appKey]);
		}
		expect(web.en.tab_appointments).toBe('Bookings');
	});

	it('(negative, planted) an English that differs under the same Greek is reported; another Greek is another text', () => {
		const app = {
			el: {
				'appointments.cancel.then.freed': 'Η ώρα ελευθερώνεται.',
				'help.title': 'Κέντρο βοήθειας'
			},
			en: { 'appointments.cancel.then.freed': 'The time opens up.', 'help.title': 'Help Centre' }
		};
		const web = {
			el: {
				appointments_cancel_then_freed: 'Η ώρα ελευθερώνεται.',
				help_title: 'Πώς μπορούμε να βοηθήσουμε;'
			},
			en: {
				appointments_cancel_then_freed: 'The time becomes free.',
				help_title: 'How can we help?'
			}
		};
		expect(englishDrift(web, app)).toEqual([
			'appointments_cancel_then_freed: «The time becomes free.» ≠ «The time opens up.»'
		]);
		expect(webKeyOf('ratings.form.hint.inDepth')).toBe('ratings_form_hint_in_depth');
		// A frame's word under another key name: found through its alias, never without it.
		const tabs = {
			web: {
				el: { tab_appointments: 'Ραντεβού' },
				en: { tab_appointments: 'Appointments' }
			},
			app: { el: { 'tabs.appointments': 'Ραντεβού' }, en: { 'tabs.appointments': 'Bookings' } }
		};
		expect(englishDrift(tabs.web, tabs.app)).toEqual([]);
		expect(englishDrift(tabs.web, tabs.app, FRAME_KEYS)).toEqual([
			'tab_appointments: «Appointments» ≠ «Bookings»'
		]);
	});
});
