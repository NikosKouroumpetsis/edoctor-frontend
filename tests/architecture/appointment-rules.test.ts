// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	APPOINTMENTS_SCAN_LIMIT,
	PATIENT_CANCEL_REASONS,
	PATIENT_RELATIVES_MAX,
	RATING_ASPECTS,
	RATING_COMMENT_MAX_LENGTH
} from '$modules/appointments/config';
import { projectRoot } from './source-scan';

/**
 * 🔴 Wave 4.0 (P-W4 §8.3 «Βάρη κριτικής», «Λόγοι ακύρωσης»): the rules screens 53–55 state before a write are the
 * server's own, read where they live (the backend's files, the `server-rules` way). A server that says them otherwise
 * fails here (S-22: ask), never the client silently.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

/** The `{ … }` right after `head` (empty when `head` is gone, which the checks then report). */
function objectAfter(text: string, head: string): string {
	const at = text.indexOf(head);
	if (at < 0) return '';
	const open = text.indexOf('{', at);
	const close = text.indexOf('}', open);
	return open < 0 || close < 0 ? '' : text.slice(open + 1, close);
}

/** `name: 1.2,` pairs of an object literal, in order. */
function pairsOf(body: string): [string, string][] {
	return [...body.matchAll(/(\w+)\s*:\s*([\w.']+)\s*,?/gu)].map((match) => [
		match[1] as string,
		(match[2] as string).replace(/'/gu, '')
	]);
}

function weightFindings(policy: string): string[] {
	const server = pairsOf(objectAfter(policy, 'const RATING_WEIGHTS'));
	const client = RATING_ASPECTS.map((aspect) => [aspect.field, String(aspect.weight)]);
	const findings: string[] = [];
	if (
		JSON.stringify(server.map(([field, weight]) => [field, String(Number(weight))])) !==
		JSON.stringify(client)
	) {
		findings.push(`weights: server ${JSON.stringify(server)} ≠ client ${JSON.stringify(client)}`);
	}
	if (!/Number\(\(weightedSum \/ WEIGHT_SUM\)\.toFixed\(2\)\)/u.test(policy)) {
		findings.push('the overall is no longer the weighted mean to two decimals');
	}
	if (!/OPTIONAL_TEXT_SCHEMA = Joi\.string\(\)\.trim\(\)\.min\(1\)\.max\((\d+)\)/u.test(policy)) {
		findings.push('the review text schema moved');
	} else if (
		Number(
			/OPTIONAL_TEXT_SCHEMA = Joi\.string\(\)\.trim\(\)\.min\(1\)\.max\((\d+)\)/u.exec(policy)?.[1]
		) !== RATING_COMMENT_MAX_LENGTH
	) {
		findings.push('the review text limit differs');
	}
	if (!/FORBIDDEN_TEXT_PATTERN = \/\[<>\]\//u.test(policy))
		findings.push('the forbidden characters moved');
	return findings;
}

function reasonFindings(reasons: string): string[] {
	const server = pairsOf(
		objectAfter(reasons, 'export const APPOINTMENT_PATIENT_CANCEL_REASONS')
	).map(([key]) => key);
	return JSON.stringify(server) === JSON.stringify(PATIENT_CANCEL_REASONS)
		? []
		: [
				`patient reasons: server ${JSON.stringify(server)} ≠ client ${JSON.stringify(PATIENT_CANCEL_REASONS)}`
			];
}

/**
 * Review w4-w3 R1 NIT-1: the stars of a grade (`gradeOf`, `lib/rating`) are the server's `toRatingStars` — half of the
 * stored score over its whole hundredths, rounded to two decimals on a 0–5 scale out of 10.
 */
function starsFindings(helper: string): string[] {
	const findings: string[] = [];
	if (!/RATING_STARS_MAX = 5;/u.test(helper)) findings.push('the stars are no longer out of 5');
	if (!/RATING_SCORE_MAX = 10;/u.test(helper)) findings.push('the score is no longer out of 10');
	if (
		!/const hundredths = Math\.round\(score \* 100\);/u.test(helper) ||
		!/return Math\.round\(\(hundredths \* RATING_STARS_MAX\) \/ RATING_SCORE_MAX\) \/ 100;/u.test(
			helper
		)
	) {
		findings.push('the stars are no longer the hundredths halved to two decimals');
	}
	return findings;
}

/**
 * Review w4-w3 R1 NIT-1: the ONE read of the upcoming a relative's deletion asks (D-W4-21) is the server's largest page
 * (`listPageSizeMax`): a smaller one would answer that read with a `422`.
 */
function scanFindings(config: string): string[] {
	const max = Number(/listPageSizeMax: (\d+),/u.exec(config)?.[1]);
	return max === APPOINTMENTS_SCAN_LIMIT
		? []
		: [`the scan's ${APPOINTMENTS_SCAN_LIMIT} is not the server's page of ${max}`];
}

describe('🔴 wave 4.0 · the server’s rules of the rating, the cancellation and the relatives', () => {
	it('«Βάρη κριτικής»: the aspects, their order and weights, the formula, the text’s limit and forbidden characters are the server’s', () => {
		expect(
			weightFindings(readBackend('src/modules/appointment-rating/domain/policies/rating/Policy.ts'))
		).toEqual([]);
	});

	it('«Λόγοι ακύρωσης»: the patient’s five, in the server’s order', () => {
		expect(
			reasonFindings(
				readBackend('src/modules/appointment/domain/policies/appointment-reasons/Policy.ts')
			)
		).toEqual([]);
	});

	it('the relatives a person keeps: the server’s `PATIENT_RELATIVES_MAX`', () => {
		const config = readBackend('src/shared/config/relatives/index.ts');
		expect(Number(/PATIENT_RELATIVES_MAX = (\d+)/u.exec(config)?.[1])).toBe(PATIENT_RELATIVES_MAX);
	});

	it('review w4-w3 R1 NIT-1: the grade’s stars are the server’s `toRatingStars`; the scan of the upcoming is its largest page', () => {
		expect(starsFindings(readBackend('src/shared/domain/helpers/rating-stars/index.ts'))).toEqual(
			[]
		);
		expect(scanFindings(readBackend('src/shared/config/appointment/index.ts'))).toEqual([]);
	});

	it('review w4-w3 R1 NIT-1 (negative, planted): another scale, another rounding, a smaller page are reported', () => {
		const helper = [
			'export const RATING_SCORE_MAX = 10;',
			'export const RATING_STARS_MAX = 5;',
			'  const hundredths = Math.round(score * 100);',
			'  return Math.round((hundredths * RATING_STARS_MAX) / RATING_SCORE_MAX) / 100;'
		].join('\n');
		expect(starsFindings(helper)).toEqual([]);
		expect(
			starsFindings(helper.replace('RATING_STARS_MAX = 5;', 'RATING_STARS_MAX = 10;'))
		).toEqual(['the stars are no longer out of 5']);
		expect(starsFindings(helper.replace('/ 100;', '/ 10;'))).toEqual([
			'the stars are no longer the hundredths halved to two decimals'
		]);
		expect(scanFindings('  listPageSizeMax: 100,')).toEqual([]);
		expect(scanFindings('  listPageSizeMax: 50,')).toEqual([
			"the scan's 100 is not the server's page of 50"
		]);
		expect(scanFindings('')).toHaveLength(1);
	});

	it('(negative, planted) a weight, an order, a formula or a reason that differs is reported', () => {
		const policy = [
			'const OPTIONAL_TEXT_SCHEMA = Joi.string().trim().min(1).max(2000);',
			'const FORBIDDEN_TEXT_PATTERN = /[<>]/;',
			'const RATING_WEIGHTS = {',
			'  inDepthRating: 1.2,',
			'  trustRating: 1.0,',
			'  expertiseRating: 1.2,',
			'  punctualRating: 0.8,',
			'  friendlyRating: 0.8,',
			'} as const;',
			'return Number((weightedSum / WEIGHT_SUM).toFixed(2));'
		].join('\n');
		expect(weightFindings(policy)).toEqual([]);
		expect(weightFindings(policy.replace('trustRating: 1.0', 'trustRating: 1.1'))).toHaveLength(1);
		expect(weightFindings(policy.replace('toFixed(2)', 'toFixed(1)'))).toEqual([
			'the overall is no longer the weighted mean to two decimals'
		]);
		expect(weightFindings(policy.replace('max(2000)', 'max(1000)'))).toEqual([
			'the review text limit differs'
		]);
		expect(weightFindings(policy.replace('/[<>]/', '/[<>&]/'))).toEqual([
			'the forbidden characters moved'
		]);
		expect(weightFindings('')).toHaveLength(4);
		const reasons = [
			'export const APPOINTMENT_PATIENT_CANCEL_REASONS = {',
			"  SCHEDULE_CONFLICT: 'SCHEDULE_CONFLICT',",
			"  FEELING_BETTER: 'FEELING_BETTER',",
			"  FOUND_ANOTHER_DOCTOR: 'FOUND_ANOTHER_DOCTOR',",
			"  PERSONAL: 'PERSONAL',",
			"  OTHER: 'OTHER',",
			'} as const;'
		].join('\n');
		expect(reasonFindings(reasons)).toEqual([]);
		expect(reasonFindings(reasons.replace("  PERSONAL: 'PERSONAL',\n", ''))).toHaveLength(1);
	});
});
