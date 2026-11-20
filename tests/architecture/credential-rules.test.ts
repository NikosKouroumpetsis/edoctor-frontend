// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toDoctorCredentialsBody } from '$modules/doctor-dashboard/api/credentials';
import {
	DOCTOR_CREDENTIAL_LIMIT,
	DOCTOR_CREDENTIAL_MIN_YEAR,
	DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH,
	DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH
} from '$modules/doctor-dashboard/config';
import {
	doctorCredentialError,
	doctorCredentialLastYear,
	emptyDoctorCredentialValues
} from '$modules/doctor-dashboard/lib/cv';
import { projectRoot, readSourceFiles } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 81 (U-210, U-207.3, D-W52-61, D-W52-63): the rules the web states before a save of the biography
 * are the server's own, read where they live (the backend's files, the `specialization-rules` way) — twenty rows a
 * group, the bounds of a title and of an organization, the first year, and «next year» as the last one. A server that
 * says them otherwise fails here (S-22: ask), never the client silently. And the doctor's save is Greek alone, with no
 * choice of a language anywhere on the two pages.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

const POLICY = 'src/modules/doctor/domain/policies/credential/Policy.ts';

/** Each bound the web keeps, under the name the server's policy gives it. */
const WEB_BOUNDS: Record<string, number> = {
	DOCTOR_CREDENTIAL_MAX_ITEMS: DOCTOR_CREDENTIAL_LIMIT,
	DOCTOR_CREDENTIAL_TITLE_MAX: DOCTOR_CREDENTIAL_TITLE_MAX_LENGTH,
	DOCTOR_CREDENTIAL_ORGANIZATION_MAX: DOCTOR_CREDENTIAL_ORGANIZATION_MAX_LENGTH,
	DOCTOR_CREDENTIAL_MIN_YEAR: DOCTOR_CREDENTIAL_MIN_YEAR
};

/** The bounds of the server's policy that the web says otherwise, or that the policy no longer says this way. */
function boundFindings(policy: string): string[] {
	return Object.entries(WEB_BOUNDS).flatMap(([name, web]) => {
		const match = new RegExp(`export const ${name} = (\\d+);`, 'u').exec(policy);
		if (!match) return [`${POLICY}: no ${name}`];
		return Number(match[1]) === web
			? []
			: [`${name}: the server keeps ${match[1]}, the web ${web}`];
	});
}

/** The last year: the server takes the platform's calendar year and one more; the web must say the same. */
function lastYearFindings(policy: string): string[] {
	return /const lastYear = Number\(platformCalendarDay\(now\)\.slice\(0, 4\)\) \+ 1;/u.test(policy)
		? []
		: [`${POLICY}: the last year is no longer «next year on the platform's calendar»`];
}

/** 🔴 U-207.3: a file of the two pages that offers a language to write in. */
function languageFindings(files: { path: string; text: string }[]): string[] {
	return files
		.filter((file) =>
			/^src\/modules\/doctor-dashboard\/(ui\/(cv|credential)|lib\/cv)\//u.test(file.path)
		)
		.filter((file) =>
			/LanguageSwitcher|SegmentedControl|PillTabs|language:\s*['"]en['"]/u.test(file.text)
		)
		.map((file) => `${file.path}: a choice of a language`);
}

describe('the rules of the biography are the server’s own (wave 5.2 · screen 81)', () => {
	it('🔴 U-210 / D-W52-63: twenty rows a group, a title of 300, an organization of 200 and the first year 1950 are the server’s own bounds', () => {
		expect(boundFindings(readBackend(POLICY))).toEqual([]);
	});

	it('🔴 U-210 / D-W52-63: the last year is NEXT year on the platform’s calendar, as the server reads it — and the web refuses the year after it, as the server does', () => {
		expect(lastYearFindings(readBackend(POLICY))).toEqual([]);
		const now = Date.parse('2026-11-18T10:00:00Z');
		const last = doctorCredentialLastYear(now);
		expect(last).toBe(2027);
		const year = (startYear: string) =>
			doctorCredentialError(
				'startYear',
				'WORK',
				{ ...emptyDoctorCredentialValues(), title: 'Θέση', startYear },
				last
			);
		expect([year('1949'), year('1950'), year('2027'), year('2028')]).toEqual([
			'year',
			null,
			null,
			'year'
		]);
	});

	it('🔴 U-207.3 / D-W52-61: a save of the doctor is Greek alone — one text a row, `el` — and neither page offers a language to write in', () => {
		const body = toDoctorCredentialsBody('STUDY', [
			{ title: 'Πτυχίο', organization: null, startYear: null, endYear: null, isCurrent: false }
		]);
		expect(body.items.map((item) => item.translations.map((text) => text.language))).toEqual([
			['el']
		]);
		const files = readSourceFiles();
		expect(files.length).toBeGreaterThan(500);
		expect(languageFindings(files)).toEqual([]);
	});

	it('(negative, planted) another bound, a server that no longer says it, another last year, or a page with a choice of a language is reported', () => {
		expect(
			boundFindings(
				[
					'export const DOCTOR_CREDENTIAL_MAX_ITEMS = 30;',
					'export const DOCTOR_CREDENTIAL_TITLE_MAX = 300;',
					'export const DOCTOR_CREDENTIAL_MIN_YEAR = 1950;'
				].join('\n')
			)
		).toEqual([
			'DOCTOR_CREDENTIAL_MAX_ITEMS: the server keeps 30, the web 20',
			`${POLICY}: no DOCTOR_CREDENTIAL_ORGANIZATION_MAX`
		]);
		expect(
			lastYearFindings('const lastYear = Number(platformCalendarDay(now).slice(0, 4));')
		).toEqual([`${POLICY}: the last year is no longer «next year on the platform's calendar»`]);
		expect(
			languageFindings([
				{
					path: 'src/modules/doctor-dashboard/ui/credential/page/index.svelte',
					text: '<SegmentedControl options={languages} />'
				},
				{
					path: 'src/modules/doctor-dashboard/lib/cv/index.ts',
					text: "translations: [{ language: 'en', title }]"
				},
				{
					path: 'src/modules/doctor-dashboard/ui/cv/page/index.svelte',
					text: '<ListRow title={row.title} />'
				},
				{ path: 'src/shared/ui/molecules/language-switcher/index.ts', text: 'LanguageSwitcher' }
			])
		).toEqual([
			'src/modules/doctor-dashboard/ui/credential/page/index.svelte: a choice of a language',
			'src/modules/doctor-dashboard/lib/cv/index.ts: a choice of a language'
		]);
	});
});
