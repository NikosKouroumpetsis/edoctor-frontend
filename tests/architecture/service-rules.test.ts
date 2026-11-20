// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VISIT_LENGTHS } from '$shared/lib/visit-length';
import { toDoctorServiceCreateBody } from '$modules/doctor-dashboard/api/services';
import {
	DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH,
	DOCTOR_SERVICE_PRICE_MAX,
	DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH,
	DOCTOR_SERVICE_YEARS_MAX
} from '$modules/doctor-dashboard/config';
import { newDoctorServiceValues } from '$modules/doctor-dashboard/lib/services';
import { DOCTOR_ONBOARDING_DURATIONS } from '$modules/doctor-onboarding/config';
import { projectRoot, readSourceFiles, type SourceFile } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 83 (U-212, U-213.1, U-214, U-217.3, D-W52-10, D-W52-71 … 83): the rules the web states before a
 * save of a service are the server's own, read where they live (the `credential-rules` way) — ONE list of lengths for
 * the sign-up and the services, the price, the bounds of the texts and the years. A server that says them otherwise
 * fails here (S-22: ask), never the client silently. And eDoctor's texts reach the fields ONLY through the button, a
 * new service has NO price, and nothing on the pages offers a language to write in.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

const CONFIG = 'src/shared/config/doctor/index.ts';
const POLICY = 'src/modules/doctor-service/domain/policies/doctor-service/Policy.ts';
const PAGES =
	/^src\/modules\/doctor-dashboard\/(ui\/(services|service|catalogue)|lib\/services)\//u;

/** The server's list of lengths, or `null` when it no longer writes one. */
function serverLengths(config: string): number[] | null {
	const match = /export const DOCTOR_SERVICE_VISIT_DURATIONS = \[([\d,\s]+)\] as const;/u.exec(
		config
	);
	return match ? match[1].split(',').map((value) => Number(value.trim())) : null;
}

/** Each bound the web keeps, under the name the server gives it. */
const WEB_BOUNDS: Record<string, number> = {
	DOCTOR_SERVICE_PRICE_MAX,
	DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH,
	DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH
};

function boundFindings(config: string, policy: string): string[] {
	const findings = Object.entries(WEB_BOUNDS).flatMap(([name, web]) => {
		const match = new RegExp(`export const ${name} = (\\d+);`, 'u').exec(config);
		if (!match) return [`${CONFIG}: no ${name}`];
		return Number(match[1]) === web
			? []
			: [`${name}: the server keeps ${match[1]}, the web ${web}`];
	});
	const years = /export const DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX = (\d+);/u.exec(policy);
	if (!years) return [...findings, `${POLICY}: no DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX`];
	return Number(years[1]) === DOCTOR_SERVICE_YEARS_MAX
		? findings
		: [
				...findings,
				`DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX: the server keeps ${years[1]}, the web ${DOCTOR_SERVICE_YEARS_MAX}`
			];
}

/** 🔴 U-214.4: a file of the pages that copies eDoctor's texts into a field anywhere but the button's own `suggest()`. */
function suggestionFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => PAGES.test(file.path))
		.flatMap((file) => {
			const copies = [...file.text.matchAll(/setValue\(\s*'(subtitle|description)',\s*([^)]*)\)/gu)]
				.filter((match) => /suggest/iu.test(match[2]))
				.map((match) => match.index ?? 0);
			const button = file.text.indexOf('suggest(): boolean');
			return copies
				.filter((at) => button < 0 || at < button || at > button + 600)
				.map(() => `${file.path}: eDoctor's text copied into a field outside the button`);
		});
}

/** 🔴 U-207.3: a file of the pages that offers a language to write in. */
function languageFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => PAGES.test(file.path))
		.filter((file) =>
			/LanguageSwitcher|SegmentedControl|PillTabs|language:\s*['"]en['"]/u.test(file.text)
		)
		.map((file) => `${file.path}: a choice of a language`);
}

describe('the rules of a service are the server’s own (wave 5.2 · screen 83)', () => {
	it('🔴 U-212.4 / U-213.1 / D-W52-10 / D-W52-83: ONE list of lengths — 15, 20, then every quarter to two hours — the server’s, the sign-up’s and the services’', () => {
		expect(serverLengths(readBackend(CONFIG))).toEqual([...VISIT_LENGTHS]);
		expect([...DOCTOR_ONBOARDING_DURATIONS]).toEqual([...VISIT_LENGTHS]);
	});

	it('🔴 U-212.1 / D-W52-71: the price 1 to 9999, a subtitle of 120, a description of 1000 and the years to 70 are the server’s own bounds', () => {
		expect(boundFindings(readBackend(CONFIG), readBackend(POLICY))).toEqual([]);
	});

	it('🔴 U-217.3 / U-214.4 / D-W52-78: a new service has NO price and EMPTY texts — eDoctor’s only through the button — and its save is Greek alone, never `amount`', () => {
		const values = newDoctorServiceValues({
			serviceId: '0193d000-0000-7000-8000-000000009005',
			title: 'Holter',
			suggestedSubtitle: 'Πρόταση',
			suggestedDescription: 'Πρόταση',
			durationInMinutes: 20,
			owned: false
		});
		expect([values.price, values.subtitle, values.description]).toEqual(['', '', '']);
		const body = toDoctorServiceCreateBody('d', 's', {
			price: 1,
			durationInMinutes: 15,
			subtitle: null,
			description: null,
			years: null
		});
		expect(body.translations.map((text) => text.language)).toEqual(['el']);
		expect(body).not.toHaveProperty('amount');
		const files = readSourceFiles();
		expect(files.length).toBeGreaterThan(500);
		expect(files.filter((file) => PAGES.test(file.path)).length).toBeGreaterThan(5);
		expect(suggestionFindings(files)).toEqual([]);
		expect(languageFindings(files)).toEqual([]);
	});

	it('(negative, planted) another list, another bound, a server that no longer says it, a text copied outside the button, or a choice of a language is reported', () => {
		expect(
			serverLengths('export const DOCTOR_SERVICE_VISIT_DURATIONS = [15, 20, 30, 45, 60] as const;')
		).toEqual([15, 20, 30, 45, 60]);
		expect(serverLengths('export const DURATIONS = [15];')).toBeNull();
		expect(
			boundFindings(
				[
					'export const DOCTOR_SERVICE_PRICE_MAX = 99999;',
					'export const DOCTOR_SERVICE_SUBTITLE_MAX_LENGTH = 120;'
				].join('\n'),
				'export const DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX = 60;'
			)
		).toEqual([
			'DOCTOR_SERVICE_PRICE_MAX: the server keeps 99999, the web 9999',
			`${CONFIG}: no DOCTOR_SERVICE_DESCRIPTION_MAX_LENGTH`,
			'DOCTOR_SERVICE_YEARS_OF_EXPERIENCE_MAX: the server keeps 60, the web 70'
		]);
		expect(
			suggestionFindings([
				{
					path: 'src/modules/doctor-dashboard/ui/service/hooks/use-service.svelte.ts',
					text: "$effect(() => form.setValue('subtitle', suggestion.subtitle));"
				},
				{
					path: 'src/modules/doctor-dashboard/ui/service/hooks/use-service.svelte.ts',
					text: "suggest(): boolean { form.setValue('subtitle', suggestion.subtitle); }"
				}
			])
		).toEqual([
			"src/modules/doctor-dashboard/ui/service/hooks/use-service.svelte.ts: eDoctor's text copied into a field outside the button"
		]);
		expect(
			languageFindings([
				{
					path: 'src/modules/doctor-dashboard/ui/service/page/index.svelte',
					text: '<SegmentedControl options={languages} />'
				},
				{
					path: 'src/modules/doctor-dashboard/ui/services/page/index.svelte',
					text: '<Row {row} />'
				}
			])
		).toEqual([
			'src/modules/doctor-dashboard/ui/service/page/index.svelte: a choice of a language'
		]);
	});
});
