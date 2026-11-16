// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH,
	APPOINTMENTS_SCAN_LIMIT,
	PATIENT_CANCEL_REASONS,
	PATIENT_RELATIVES_MAX,
	RATING_ASPECTS,
	RATING_COMMENT_MAX_LENGTH
} from '$modules/appointments/config';
import { APPOINTMENT_CANCEL_TOKEN } from '$modules/appointments/lib/cancel-link';
import {
	DOCTOR_CANCEL_REASONS,
	DOCTOR_CHARGES_MAX_AMOUNT,
	DOCTOR_CHARGES_MAX_SERVICES,
	DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH,
	DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH,
	DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH,
	DOCTOR_PATIENT_SEARCH_MAX_LENGTH,
	DOCTOR_PATIENTS_PAGE_LIMIT,
	DOCTOR_REASON_TEXT_MAX_LENGTH,
	DOCTOR_REJECT_REASONS,
	DOCTOR_RESCHEDULE_WINDOW_DAYS
} from '$modules/doctor-dashboard/config';
import { DOCTOR_CORRECTION_RATED } from '$modules/doctor-dashboard/api/appointments';
import { DOCTOR_GREEK_MOBILE } from '$modules/doctor-dashboard/lib/new';
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

/** D-W51-47: a doctor-side list of the server (`export const <name> = { … }`) against the client's, by its keys. */
function doctorListFindings(reasons: string, name: string, client: readonly string[]): string[] {
	const server = pairsOf(objectAfter(reasons, `export const ${name}`)).map(([key]) => key);
	return JSON.stringify(server) === JSON.stringify(client)
		? []
		: [`${name}: server ${JSON.stringify(server)} ≠ client ${JSON.stringify(client)}`];
}

type OpenApiSchema = { properties?: Record<string, { maxLength?: number }> };

/** The `maxLength` of one field of an operation's JSON body in the vendored contract (`null` when it names none). */
function bodyMaxLength(spec: unknown, path: string, field: string): number | null {
	const operation = (spec as { paths?: Record<string, { post?: unknown }> }).paths?.[path]?.post as
		| { requestBody?: { content?: { 'application/json'?: { schema?: OpenApiSchema } } } }
		| undefined;
	const limit =
		operation?.requestBody?.content?.['application/json']?.schema?.properties?.[field]?.maxLength;
	return typeof limit === 'number' ? limit : null;
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

	it('🔴 D-W51-47 (screen 69, card w51-w5): the doctor’s reasons — a request’s four, an appointment’s three — in the server’s order', () => {
		const reasons = readBackend(
			'src/modules/appointment/domain/policies/appointment-reasons/Policy.ts'
		);
		expect(
			doctorListFindings(reasons, 'APPOINTMENT_REJECT_REASONS', DOCTOR_REJECT_REASONS)
		).toEqual([]);
		expect(
			doctorListFindings(reasons, 'APPOINTMENT_DOCTOR_CANCEL_REASONS', DOCTOR_CANCEL_REASONS)
		).toEqual([]);
	});

	it('🔴 U-65.6 / D-W51-34: μήνυμα ως 500 — the field’s bound is the contract’s `maxLength` of both words and the server’s constant', () => {
		const spec = JSON.parse(
			readFileSync(join(projectRoot, 'src/generated/api/openapi.json'), 'utf8')
		) as unknown;
		expect(bodyMaxLength(spec, '/appointment/appointments/{appointmentId}/reject', 'message')).toBe(
			DOCTOR_REASON_TEXT_MAX_LENGTH
		);
		expect(
			bodyMaxLength(spec, '/appointment/appointments/{appointmentId}/cancel', 'reasonText')
		).toBe(DOCTOR_REASON_TEXT_MAX_LENGTH);
		const config = readBackend('src/shared/config/appointment/index.ts');
		expect(Number(/APPOINTMENT_REASON_TEXT_MAX_LENGTH = (\d+)/u.exec(config)?.[1])).toBe(
			DOCTOR_REASON_TEXT_MAX_LENGTH
		);
	});

	it('(negative, planted) D-W51-47 · D-W51-34: a list in another order or a missing bound is reported', () => {
		const lists = [
			'export const APPOINTMENT_DOCTOR_CANCEL_REASONS = {',
			"  DOCTOR_UNAVAILABLE: 'DOCTOR_UNAVAILABLE',",
			"  EMERGENCY: 'EMERGENCY',",
			"  OTHER: 'OTHER',",
			'} as const;'
		].join('\n');
		expect(
			doctorListFindings(lists, 'APPOINTMENT_DOCTOR_CANCEL_REASONS', DOCTOR_CANCEL_REASONS)
		).toEqual([]);
		expect(
			doctorListFindings(
				lists.replace("  EMERGENCY: 'EMERGENCY',\n", ''),
				'APPOINTMENT_DOCTOR_CANCEL_REASONS',
				DOCTOR_CANCEL_REASONS
			)
		).toHaveLength(1);
		expect(
			doctorListFindings('', 'APPOINTMENT_REJECT_REASONS', DOCTOR_REJECT_REASONS)
		).toHaveLength(1);
		const path = '/appointment/appointments/{appointmentId}/reject';
		const body = (limit?: number) => ({
			paths: {
				[path]: {
					post: {
						requestBody: {
							content: {
								'application/json': { schema: { properties: { message: { maxLength: limit } } } }
							}
						}
					}
				}
			}
		});
		expect(bodyMaxLength(body(500), path, 'message')).toBe(500);
		expect(bodyMaxLength(body(), path, 'message')).toBeNull();
		expect(bodyMaxLength({}, path, 'message')).toBeNull();
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

describe('🔴 screen 70 · the doctor’s bounds are the contract’s (D-W51-41, D-W51-44; card w51-w6)', () => {
	type Spec = { paths?: Record<string, Record<string, unknown>> };
	const spec = () =>
		JSON.parse(readFileSync(join(projectRoot, 'src/generated/api/openapi.json'), 'utf8')) as Spec;

	it('U-65.6 / D-W51-44: «Υπηρεσίες και κόστος» sends 1 to the contract’s most services and a price up to its bound; the free hours are read a week at a time, the server’s most', () => {
		const put = spec().paths?.['/appointment/appointments/{appointmentId}/charges']?.put as {
			requestBody?: {
				content?: {
					'application/json'?: {
						schema?: {
							properties?: {
								services?: { maxItems?: number; minItems?: number };
								finalTotalAmount?: { maximum?: number; minimum?: number };
							};
						};
					};
				};
			};
		};
		const body = put?.requestBody?.content?.['application/json']?.schema?.properties;
		expect(body?.services?.maxItems).toBe(DOCTOR_CHARGES_MAX_SERVICES);
		expect(body?.services?.minItems).toBe(1);
		expect(body?.finalTotalAmount?.maximum).toBe(DOCTOR_CHARGES_MAX_AMOUNT);
		expect(body?.finalTotalAmount?.minimum).toBe(0);
		const get = spec().paths?.['/appointment/appointments/{appointmentId}/reschedule-slots']
			?.get as {
			parameters?: { name: string; schema?: { maximum?: number } }[];
		};
		expect(get?.parameters?.find((parameter) => parameter.name === 'days')?.schema?.maximum).toBe(
			DOCTOR_RESCHEDULE_WINDOW_DAYS
		);
	});
});

// Rewrites «🔴 screen 71 · the review that stops a correction is the server’s own refusal» (card w51-w7: the 409's
// WORDS): step 8 (card w51-w8 §2β, w51-b9 «Προσθήκη 2») — the server now marks that 409 with `details.reason`
// `PATIENT_ALREADY_RATED`, and the client reads the mark, never the words; the guard follows the mark to the server.
describe('🔴 screen 71 · the review that stops a correction is the server’s own mark (D-W51-62, U-196.1; cards w51-w7, w51-w8)', () => {
	const COMMAND = 'src/modules/appointment/application/commands/appointment/Command.ts';
	const POLICY = 'src/modules/appointment/domain/policies/appointment-outcome/Policy.ts';

	/** The value of the server's mark (`APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED`). */
	const markOf = (policy: string) =>
		/APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED\s*=\s*'([^']+)'/u.exec(policy)?.[1] ?? null;

	/** Whether the branch of a rated visit throws the `409` with that mark as its `details.reason`. */
	function ratedRefusalCarriesMark(command: string): boolean {
		const at = command.indexOf('RATING_INVITATION_REVOKE_RESULTS.ALREADY_SUBMITTED');
		if (at < 0) return false;
		return /throwAppErrorWithDetails\(\s*errors\.ALREADY_EXIST,[\s\S]{0,300}?\{\s*reason:\s*APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED\s*\}/u.test(
			command.slice(at, at + 500)
		);
	}

	it('U-196.1: «Ο ασθενής έχει ήδη γράψει κριτική» answers the server’s mark of a rated visit — and the mark marks nothing else', () => {
		const command = readBackend(COMMAND);
		expect(markOf(readBackend(POLICY))).toBe(DOCTOR_CORRECTION_RATED);
		expect(ratedRefusalCarriesMark(command)).toBe(true);
		// The other refusals of the same write (D-24 window, a second declaration, before the hour) carry no mark.
		expect(command.match(/reason:\s*APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED/gu)).toHaveLength(
			1
		);
	});

	it('(negative, planted) a server that drops the mark, or names it otherwise, is reported', () => {
		expect(
			ratedRefusalCarriesMark(
				"if (revoked.data.result === RATING_INVITATION_REVOKE_RESULTS.ALREADY_SUBMITTED) { throwAppError(errors.ALREADY_EXIST, 'a review exists.'); }"
			)
		).toBe(false);
		expect(markOf("export const APPOINTMENT_CORRECTION_PATIENT_ALREADY_RATED = 'RATED';")).not.toBe(
			DOCTOR_CORRECTION_RATED
		);
		expect(ratedRefusalCarriesMark('nothing here')).toBe(false);
	});
});

describe('🔴 screen 72 · «Νέο ραντεβού» states the server’s bounds (D-W51-54, D-W51-55, D-W51-70; card w51-w8)', () => {
	type Schema = {
		maxLength?: number;
		maximum?: number;
		minLength?: number;
		enum?: string[];
		anyOf?: Schema[];
		properties?: Record<string, Schema>;
	};
	type Operation = {
		parameters?: { name: string; schema?: Schema }[];
		requestBody?: { content?: { 'application/json'?: { schema?: Schema } } };
	};
	const spec = () =>
		JSON.parse(readFileSync(join(projectRoot, 'src/generated/api/openapi.json'), 'utf8')) as {
			paths?: Record<string, Record<string, Operation>>;
		};
	const op = (path: string, method: string) => spec().paths?.[path]?.[method];
	const param = (operation: Operation | undefined, name: string) =>
		operation?.parameters?.find((entry) => entry.name === name)?.schema;
	const body = (operation: Operation | undefined) =>
		operation?.requestBody?.content?.['application/json']?.schema?.properties;

	it('U-65.6: the search is 40 at most and a page fits the contract; «Νέος ασθενής» stops where the server does', () => {
		const search = op('/appointment/doctor/patients', 'get');
		expect(param(search, 'q')?.maxLength).toBe(DOCTOR_PATIENT_SEARCH_MAX_LENGTH);
		expect(DOCTOR_PATIENTS_PAGE_LIMIT).toBeLessThanOrEqual(param(search, 'limit')?.maximum ?? 0);
		const patient = body(op('/appointment/appointments', 'post'))?.newPatient?.properties;
		expect(patient?.firstName?.maxLength).toBe(DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH);
		expect(patient?.lastName?.maxLength).toBe(DOCTOR_NEW_PATIENT_NAME_MAX_LENGTH);
		expect(patient?.phone?.maxLength).toBe(DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH);
		expect(patient?.email?.anyOf?.[0]?.maxLength).toBe(DOCTOR_NEW_PATIENT_EMAIL_MAX_LENGTH);
		expect(param(op('/appointment/doctor/patients/phone-match', 'get'), 'phone')?.maxLength).toBe(
			DOCTOR_NEW_PATIENT_PHONE_MAX_LENGTH
		);
	});

	it('U-197.3: a Greek mobile is the server’s own rule, character for character', () => {
		const policy = readBackend('src/shared/domain/policies/phone/Policy.ts');
		const server = /GREEK_MOBILE_RE\s*=\s*\/(.+)\/;/u.exec(policy)?.[1] ?? null;
		expect(server).toBe(DOCTOR_GREEK_MOBILE.source);
		expect(/PhonePrimitive\.normalize/u.test(policy)).toBe(true);
	});
});

describe('🔴 the cancel link’s page states the server’s link (D-W51-58, D-W51-72; card w51-w8)', () => {
	type Operation = {
		parameters?: { name: string; schema?: { maxLength?: number; pattern?: string } }[];
		requestBody?: {
			content?: {
				'application/json'?: {
					schema?: { properties?: Record<string, { enum?: string[]; maxLength?: number }> };
				};
			};
		};
	};
	const post = () =>
		(
			JSON.parse(readFileSync(join(projectRoot, 'src/generated/api/openapi.json'), 'utf8')) as {
				paths?: Record<string, Record<string, Operation>>;
			}
		).paths?.['/appointment/public/cancel-links/{cancelToken}']?.post;

	it('U-198.1: the secret is the server’s 16 base64url characters; the reasons are the patient’s five; the words 500', () => {
		const token = readBackend('src/shared/utils/security/opaque-token/index.ts');
		const length = Number(/OPAQUE_TOKEN_LENGTH\s*=\s*(\d+)/u.exec(token)?.[1]);
		expect(APPOINTMENT_CANCEL_TOKEN.source).toBe(`^[A-Za-z0-9_-]{${length}}$`);
		const fields = post()?.requestBody?.content?.['application/json']?.schema?.properties;
		expect(fields?.reasonCode?.enum).toEqual([...PATIENT_CANCEL_REASONS]);
		expect(fields?.reasonText?.maxLength).toBe(APPOINTMENT_CANCEL_MESSAGE_MAX_LENGTH);
	});
});
