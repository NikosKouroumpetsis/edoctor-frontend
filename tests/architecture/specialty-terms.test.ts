import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SPECIALTY_SEARCH_TERMS } from '$modules/search-doctors/api/marketplace/category-scope';
import { DEFAULT_SPECIALTY_TERM } from '$modules/search-doctors/api/marketplace/search-defaults';
import { homeSectionConfigs } from '$modules/search-doctors/api/marketplace/sections';
import { criteriaIcons } from '$modules/search-doctors/config/criteria-icons';
import { popularSpecialtyTerms } from '$modules/search-doctors/config/popular-searches';
import { specialtyIcon } from '$modules/search-doctors/lib/criteria-icons';
import type { CriteriaMessageKey } from '$modules/search-doctors/lib/criteria-messages';
import { getWhatFallbackSuggestionOptions } from '$modules/search-doctors/ui/search-criteria/lib/fields';
import { projectRoot } from './source-scan';

/**
 * 🔴 Κ-1 (review w3-b6 R1, MAJOR): the server finds a specialty by the start of its name, or of a word in it
 * (`backend/…/public-marketplace/BaseReader.ts:122-126`, `:282-284`), so every specialty term the web sends is a name of
 * the catalogue, or its first words, in the term's language. The catalogue: the backend's files, as production and mock.
 */
type Locale = 'el' | 'en';

const catalogueNames = (locale: Locale): string[] =>
	(
		JSON.parse(
			readFileSync(
				join(projectRoot, `../backend/src/shared/config/professionals/languages/${locale}.json`),
				'utf8'
			)
		) as { name: string }[]
	).map((row) => row.name);

const messages = (locale: Locale): Record<string, string> =>
	JSON.parse(readFileSync(join(projectRoot, `messages/${locale}.json`), 'utf8'));

/** A catalogue name, or its first words: the name itself, or the name going on after a space. */
function isCatalogueTerm(term: string, names: readonly string[]): boolean {
	return names.some((name) => name === term || name.startsWith(`${term} `));
}

/** Every specialty term the web sends in this language, with where it comes from. */
function webTerms(locale: Locale): { source: string; term: string }[] {
	const t = (key: CriteriaMessageKey) => messages(locale)[key] ?? '';
	return [
		...homeSectionConfigs.flatMap((config) =>
			(config.specialties ?? []).map((term) => ({
				source: `section ${config.id}`,
				term: term[locale]
			}))
		),
		{ source: 'DEFAULT_SPECIALTY_TERM', term: DEFAULT_SPECIALTY_TERM[locale] },
		...Object.entries(popularSpecialtyTerms).map(([id, term]) => ({
			source: `popular ${id}`,
			term: term[locale]
		})),
		// A static «Τι;» row commits its own label as the words searched (`fields.ts:141-150`).
		...getWhatFallbackSuggestionOptions(t).map((option) => ({
			source: `static ${option.value}`,
			term: option.label
		})),
		// The rail's terms are English in both languages (the server reads every translation).
		...(locale === 'en'
			? Object.entries(SPECIALTY_SEARCH_TERMS).map(([id, term]) => ({
					source: `category ${id}`,
					term
				}))
			: [])
	];
}

describe('Κ-1: the web’s specialty terms are the catalogue’s names', () => {
	it.each(['el', 'en'] as const)(
		'Κ-1: every %s specialty term of the web is a catalogue name, or its first words',
		(locale) => {
			const names = catalogueNames(locale);
			expect(names.length).toBeGreaterThan(0);
			const terms = webTerms(locale);
			expect(terms.length).toBeGreaterThan(20);
			expect(terms.filter(({ term }) => !isCatalogueTerm(term, names))).toEqual([]);
		}
	);

	it('Κ-1: the general practitioner and the internist go by the catalogue’s names, PR005 and PR021', () => {
		expect(catalogueNames('el')).toEqual(expect.arrayContaining(['Γενικός Γιατρός', 'Παθολόγος']));
		expect(catalogueNames('en')).toEqual(
			expect.arrayContaining(['General practitioner', 'Internist'])
		);
		expect(DEFAULT_SPECIALTY_TERM).toEqual({ el: 'Γενικός Γιατρός', en: 'General practitioner' });
		expect(
			homeSectionConfigs.find((config) => config.id === 'internal-medicine-gp')?.specialties
		).toEqual([
			{ el: 'Παθολόγος', en: 'Internist' },
			{ el: 'Γενικός Γιατρός', en: 'General practitioner' }
		]);
	});

	it('U-122: the psychologist (PR030) and the mental health counselor (PR091) are two names of the catalogue; the web’s psychologist terms are PR030’s name itself, and the old joined name is gone', () => {
		const byId = (locale: Locale) =>
			Object.fromEntries(
				(
					JSON.parse(
						readFileSync(
							join(
								projectRoot,
								`../backend/src/shared/config/professionals/languages/${locale}.json`
							),
							'utf8'
						)
					) as { id: string; name: string }[]
				).map((row) => [row.id, row.name])
			);
		expect(byId('el')).toMatchObject({ PR030: 'Ψυχολόγος', PR091: 'Σύμβουλος Ψυχικής Υγείας' });
		expect(byId('en')).toMatchObject({ PR030: 'Psychologist', PR091: 'Mental health counselor' });
		expect(popularSpecialtyTerms.psychology).toEqual({ el: 'Ψυχολόγος', en: 'Psychologist' });
		expect(
			homeSectionConfigs.find((config) => config.id === 'popular-psychologists')?.specialties
		).toEqual([{ el: 'Ψυχολόγος', en: 'Psychologist' }]);
		for (const locale of ['el', 'en'] as const) {
			expect(webTerms(locale).filter(({ term }) => /Σύμβουλος|counselor/iu.test(term))).toEqual([]);
		}
	});

	it('U-122 (negative): the old joined name is no longer a catalogue term, in either language', () => {
		expect(isCatalogueTerm('Ψυχολόγος - Σύμβουλος Ψυχικής Υγείας', catalogueNames('el'))).toBe(
			false
		);
		expect(isCatalogueTerm('Psychologist - Mental health counselor', catalogueNames('en'))).toBe(
			false
		);
		expect(isCatalogueTerm('Ψυχολόγος', catalogueNames('el'))).toBe(true);
	});

	it('Κ-1 (negative): the check refuses the old words, a word from the middle of a name and half a word', () => {
		const el = catalogueNames('el');
		const en = catalogueNames('en');
		for (const planted of ['Γενικός Ιατρός', 'Διατροφολόγος', 'Δερματο']) {
			expect(isCatalogueTerm(planted, el), planted).toBe(false);
		}
		for (const planted of [
			'Internal Medicine',
			'General Practitioner',
			'Pediatrics',
			'Dentistry'
		]) {
			expect(isCatalogueTerm(planted, en), planted).toBe(false);
		}
		expect(isCatalogueTerm('Δερματολόγος', el)).toBe(true);
		expect(isCatalogueTerm('Dietitian - Nutritionist', en)).toBe(true);
	});
});

type CatalogueRow = { id: string; name: string };

const catalogueRows = (locale: Locale): CatalogueRow[] =>
	JSON.parse(
		readFileSync(
			join(projectRoot, `../backend/src/shared/config/professionals/languages/${locale}.json`),
			'utf8'
		)
	) as CatalogueRow[];

/** The ids whose el and en names wear different glyphs, one line each (none: every id wears one). */
function glyphMismatches(el: readonly CatalogueRow[], en: readonly CatalogueRow[]): string[] {
	const english = new Map(en.map((row) => [row.id, row.name]));
	return el.flatMap((row) => {
		const other = english.get(row.id);
		if (other === undefined) return [`${row.id}: no English name`];
		const [greek, latin] = [specialtyIcon(row.name), specialtyIcon(other)];
		return greek === latin ? [] : [`${row.id}: «${row.name}» ${greek}, «${other}» ${latin}`];
	});
}

describe('U-122: each specialty wears ONE glyph, in Greek and in English', () => {
	it('U-122: every id of the catalogue (the backend’s files) wears the same glyph in el and en — Παιδοψυχολόγος the brain as «Child psychologist»', () => {
		const [el, en] = [catalogueRows('el'), catalogueRows('en')];
		expect(el.length).toBeGreaterThanOrEqual(69);
		expect(new Set(el.map((row) => row.id))).toEqual(new Set(en.map((row) => row.id)));
		expect(glyphMismatches(el, en)).toEqual([]);
		const glyph = (id: string) => specialtyIcon(el.find((row) => row.id === id)?.name ?? '');
		expect(['PR030', 'PR058', 'PR091'].map(glyph)).toEqual(['brain', 'brain', 'brain']);
		// U-21's precedent, now in both languages: a pediatric compound is not its base specialty.
		expect(['PR077', 'PR033', 'PR046'].map(glyph)).toEqual(
			Array.from({ length: 3 }, () => criteriaIcons.specialty)
		);
		expect(el.filter((row) => glyph(row.id) !== criteriaIcons.specialty).length).toBe(12);
	});

	it('U-122 (negative, planted): an id whose two names wear different glyphs is reported, and one without an English name', () => {
		expect(
			glyphMismatches(
				[
					{ id: 'PRX1', name: 'Παιδοκαρδιολόγος' },
					{ id: 'PRX2', name: 'Καρδιολόγος' }
				],
				[{ id: 'PRX1', name: 'Cardiologist' }]
			)
		).toEqual([
			`PRX1: «Παιδοκαρδιολόγος» ${criteriaIcons.specialty}, «Cardiologist» fitness-outline`,
			'PRX2: no English name'
		]);
	});
});
