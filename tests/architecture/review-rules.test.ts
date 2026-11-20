// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	DOCTOR_REVIEW_REPORT_REASONS,
	toDoctorReviewReplyBody,
	toDoctorReviewReportBody
} from '$modules/doctor-dashboard/api/reviews';
import {
	DOCTOR_REVIEW_REPLY_MAX_LENGTH,
	DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH,
	DOCTOR_REVIEWS_PAGE_LIMIT
} from '$modules/doctor-dashboard/config';
import { buildDoctorMenuGroups } from '$modules/doctor-dashboard/lib/menu';
import { projectRoot, readSourceFiles, stripComments, type SourceFile } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 84 «Κριτικές» (U-218, U-219, U-220, D-W52-84 … 92): the rules the web keeps for the doctor's
 * reviews, read where they live (the `service-rules` way) — the bounds of a reply and of a report and the five reasons
 * are the server's own; the list asks for the PUBLISHED reviews of the doctor's side only (U-219.1 Ε1 Α); «Κριτικές» is a
 * row of «Μενού» that leads to its page (no void, D-W45-02); the review's row is on screen 68 ALONE (U-220.1, U-217: one
 * place); the reply and the report are PAGES (D-W52-92, U-102: never a window); nothing on them offers a language to
 * write in (U-207.3); and no word of a review is ever drawn as markup (U-65.6). A server that says them otherwise fails
 * here (S-22: ask), never the client silently.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');
const readWeb = (path: string) => stripComments(readFileSync(join(projectRoot, path), 'utf8'));

const DTO = 'src/modules/appointment-rating/application/dto/appointment-rating.ts';
const PRISMA = 'prisma/modules/appointment-rating.prisma';
const CONFIG = 'src/shared/config/appointment-rating/index.ts';
const SLICES =
	/^src\/modules\/doctor-dashboard\/(ui\/(reviews|reply|report)|lib\/reviews|api\/reviews)\//u;
const NOT_A_TEST = (file: SourceFile) =>
	!/\.test\.ts$|\.sample\.ts$|harness\.svelte$/u.test(file.path);

/** Each bound the web keeps, under the name the server gives it. */
const WEB_BOUNDS: Record<string, number> = {
	APPOINTMENT_RATING_REPLY_MAX_LENGTH: DOCTOR_REVIEW_REPLY_MAX_LENGTH,
	APPOINTMENT_RATING_REPORT_TEXT_MAX_LENGTH: DOCTOR_REVIEW_REPORT_TEXT_MAX_LENGTH
};

function boundFindings(dto: string, config: string): string[] {
	const findings = Object.entries(WEB_BOUNDS).flatMap(([name, web]) => {
		const match = new RegExp(`export const ${name} = (\\d+);`, 'u').exec(dto);
		if (!match) return [`${DTO}: no ${name}`];
		return Number(match[1]) === web
			? []
			: [`${name}: the server keeps ${match[1]}, the web ${web}`];
	});
	const list = /APPOINTMENT_RATING_LIST_CONFIG = \{[^}]*listPageSizeMax: (\d+)/u.exec(config);
	if (!list) return [...findings, `${CONFIG}: no listPageSizeMax of the rating list`];
	return Number(list[1]) >= DOCTOR_REVIEWS_PAGE_LIMIT
		? findings
		: [
				...findings,
				`the server's page is at most ${list[1]}, the web asks ${DOCTOR_REVIEWS_PAGE_LIMIT}`
			];
}

/** The server's five reasons of a report, in its order, or `null` when it no longer writes them. */
function serverReasons(prisma: string): string[] | null {
	const match = /enum RatingReportReason \{([^}]*)\}/u.exec(prisma);
	return match ? match[1].split(/\s+/u).filter(Boolean) : null;
}

/** 🔴 U-65.6: a file of the screen's slices that draws markup (`{@html}`, `innerHTML`). */
function markupFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => SLICES.test(file.path) && NOT_A_TEST(file))
		.filter((file) => /\{@html\b|\binnerHTML\b|outerHTML\b|insertAdjacentHTML/u.test(file.text))
		.map((file) => `${file.path}: markup drawn from words`);
}

/** 🔴 D-W52-92 · U-102: a page of the reply or of the report that is a window (a dialog, a sheet) instead of a page. */
function windowFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => /^src\/modules\/doctor-dashboard\/ui\/(reply|report)\//u.test(file.path))
		.filter(NOT_A_TEST)
		.filter((file) =>
			/\b(ActionDialog|Dialog|BottomSheet|Sheet|Drawer|FullscreenModal)\b/u.test(file.text)
		)
		.map((file) => `${file.path}: a window, not a page`);
}

/** 🔴 U-207.3: a file of the reply or the report that offers or sends a language. */
function languageFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => /^src\/modules\/doctor-dashboard\/ui\/(reply|report)\//u.test(file.path))
		.filter(NOT_A_TEST)
		.filter((file) => /\blanguage\s*:|LanguageSwitcher|language-switcher/u.test(file.text))
		.map((file) => `${file.path}: a language to write in`);
}

/** 🔴 U-220.1 (U-217: one place): the files that draw the review's row of an appointment. */
function reviewRowPlaces(files: SourceFile[]): string[] {
	return files
		.filter(NOT_A_TEST)
		.filter((file) => /\bm\.doctor_appointment_review\(/u.test(file.text))
		.map((file) => file.path);
}

describe('🔴 U-218 / U-219 / U-220 · D-W52-84 … 92: the doctor’s reviews (screen 84)', () => {
	it('🔴 D-W52-86 / 87: the bounds of a reply and of a report are the server’s; the page the list asks for fits the server’s', () => {
		expect(boundFindings(readBackend(DTO), readBackend(CONFIG))).toEqual([]);
	});

	it('🔴 D-W52-87 · U-219.1 Ε3 Α: the five reasons of a report are the server’s, in its order', () => {
		expect(serverReasons(readBackend(PRISMA))).toEqual([...DOCTOR_REVIEW_REPORT_REASONS]);
	});

	it('🔴 U-219.1 Ε1 Α · D-W52-84 / 89: the list asks for the doctor’s side and the PUBLISHED reviews only — every read of it', () => {
		const endpoints = readWeb('src/modules/doctor-dashboard/api/reviews/endpoints.ts');
		const reads = [
			...endpoints.matchAll(/httpSessionGet<DoctorReviewsPageView>\([^)]*\{[\s\S]*?\}\s*\)/gu)
		];
		expect(reads.length).toBe(2);
		for (const [call] of reads) {
			expect(call).toMatch(/as: 'doctor'/u);
			expect(call).toMatch(/ratingModerationStatus: 'APPROVED'/u);
		}
	});

	it('🔴 D-W52-91 (D-W45-02: no row leads to a void): «Κριτικές» is a row of «Μενού» in the ☰ and on the page, and BOTH lead to `/doctor/reviews`', () => {
		for (const place of ['menu', 'page'] as const) {
			expect(
				buildDoctorMenuGroups('el', place)
					.flat()
					.filter((row) => row.label === 'Κριτικές')
					.map((row) => row.id),
				place
			).toEqual(['reviews']);
		}
		for (const path of [
			'src/modules/doctor-dashboard/ui/menu/page/index.svelte',
			'src/modules/doctor-dashboard/ui/frame/page/index.svelte'
		]) {
			expect(readWeb(path), path).toMatch(/\breviews: doctorReviewsPath\b/u);
		}
	});

	it('🔴 U-220.1 (U-217: one place): the review’s row of an appointment is on screen 68 ALONE', () => {
		expect(reviewRowPlaces(readSourceFiles())).toEqual([
			'src/modules/doctor-dashboard/ui/appointment/page/index.svelte'
		]);
	});

	it('🔴 D-W52-92 · U-102 · U-207.3 · U-65.6: the reply and the report are pages, offer no language, and no word of a review is drawn as markup', () => {
		const files = readSourceFiles();
		expect(windowFindings(files)).toEqual([]);
		expect(languageFindings(files)).toEqual([]);
		expect(markupFindings(files)).toEqual([]);
		// The bodies: the words alone, one reason — never a language, never a doctor.
		expect(Object.keys(toDoctorReviewReplyBody('Ευχαριστώ'))).toEqual(['reply']);
		expect(Object.keys(toDoctorReviewReportBody('OTHER', 'λόγος')).sort()).toEqual([
			'reason',
			'text'
		]);
	});

	it('(negative) each rule catches what it names — a bound the server changed, a sixth reason, a window, a language, markup, a second row', () => {
		expect(
			boundFindings(
				'export const APPOINTMENT_RATING_REPLY_MAX_LENGTH = 1500;',
				'APPOINTMENT_RATING_LIST_CONFIG = { listPageSizeDefault: 20, listPageSizeMax: 10 }'
			)
		).toEqual([
			'APPOINTMENT_RATING_REPLY_MAX_LENGTH: the server keeps 1500, the web 2000',
			`${DTO}: no APPOINTMENT_RATING_REPORT_TEXT_MAX_LENGTH`,
			"the server's page is at most 10, the web asks 20"
		]);
		expect(serverReasons('enum RatingReportReason {\n  SPAM\n  OTHER\n}')).toEqual([
			'SPAM',
			'OTHER'
		]);
		const planted = (path: string, text: string): SourceFile => ({ path, text });
		expect(
			windowFindings([
				planted('src/modules/doctor-dashboard/ui/report/page/index.svelte', '<ActionDialog open>')
			])
		).toEqual(['src/modules/doctor-dashboard/ui/report/page/index.svelte: a window, not a page']);
		expect(
			languageFindings([
				planted('src/modules/doctor-dashboard/ui/reply/hooks/x.ts', "body: { language: 'en' }")
			])
		).toEqual(['src/modules/doctor-dashboard/ui/reply/hooks/x.ts: a language to write in']);
		expect(
			markupFindings([
				planted(
					'src/modules/doctor-dashboard/ui/reviews/components/card.svelte',
					'{@html card.comment}'
				)
			])
		).toEqual([
			'src/modules/doctor-dashboard/ui/reviews/components/card.svelte: markup drawn from words'
		]);
		expect(
			reviewRowPlaces([
				planted(
					'src/modules/doctor-dashboard/ui/appointment/page/index.svelte',
					'm.doctor_appointment_review({})'
				),
				planted(
					'src/modules/doctor-dashboard/ui/patient/page/index.svelte',
					'm.doctor_appointment_review({})'
				)
			])
		).toHaveLength(2);
	});
});
