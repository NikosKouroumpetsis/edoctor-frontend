import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	readBookingRelativeInvalidIds,
	readBookingRelativeRefusedFields
} from '$modules/appointments/api/relatives';
import {
	isDoctorOnboardingPhoneRefusal,
	readDoctorOnboardingFailure
} from '$modules/doctor-onboarding/api/progress';
import { projectRoot } from './source-scan';

/**
 * 🔴 W8 Delta 2 (review w3-w8 R1 MINOR-3): a few refusals carry no code and name no field, so the client reads them by the
 * server's own WORDS — the registration lock, the phone rule, the names' rule — and the ΑΜΚΑ / ΑΦΜ by the field name the
 * server writes first (U-121.3: and which of its two messages is the date's / the check digit's). This guard takes
 * those words from the backend's own files (production and mock run them) and hands each to the client's reader: if
 * the server says it otherwise, the reader no longer knows it and this fails (S-22: ask). The fixtures of the page
 * specs copy the words; only this reads them where they live.
 */
type BackendWords = { onboarding: string; validators: string; greekId: string; relative: string };

const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

const backendWords = (): BackendWords => ({
	onboarding: readBackend('src/modules/doctor/application/commands/onboarding/Command.ts'),
	validators: readBackend('src/shared/utils/validators/validator-schemas.ts'),
	greekId: readBackend('src/shared/domain/policies/greek-id/Policy.ts'),
	relative: readBackend('src/modules/patient/domain/entities/relative/Entity.ts')
});

/** The text from `start` up to `end` (empty when either is gone, which the checks then report). */
function between(text: string, start: string, end: string): string {
	const from = text.indexOf(start);
	const to = from < 0 ? -1 : text.indexOf(end, from + start.length);
	return from < 0 || to < 0 ? '' : text.slice(from, to);
}

const onboardingRefusal = (status: number, message: string, code: string) =>
	new ApiError(message, status, '/doctor/onboarding/office', code);
const relativeRefusal = (message: string) =>
	new ApiError(
		`Validation Error: Entity Validation Error: ${message}`,
		422,
		'/patient/p/relatives',
		'EC422'
	);

/** What of the server's words the client no longer reads as it should, one line each (none: they still meet). */
function serverWordFindings(source: BackendWords): string[] {
	const findings: string[] = [];

	// The registration lock: the `FORBIDDEN` of `ensureRegistrationUnlocked`, as `transformAppError` sends it.
	const lock = /errors\.FORBIDDEN,\s*'([^']+)'/u.exec(source.onboarding)?.[1];
	if (!lock) findings.push('onboarding: the registration lock’s own words are gone');
	else if (
		readDoctorOnboardingFailure(onboardingRefusal(403, `Forbidden: ${lock}`, 'EC403')) !==
		'registration-locked'
	) {
		findings.push(`onboarding: «${lock}» is no longer read as the registration lock`);
	}

	// The phone rule (`phoneSchema`): every message it can answer, on 38 / 42 and on a relative.
	const phoneRule = between(
		source.validators,
		'export const phoneSchema',
		'export const onlyCharactersSchema'
	);
	const phoneWords = [
		...phoneRule.matchAll(/(?:\bmessage:|"string\.pattern\.base":)\s*"([^"]+)"/gu)
	].map((match) => match[1]);
	if (phoneWords.length < 5)
		findings.push(`validators: ${phoneWords.length} phone messages, not 5`);
	for (const words of phoneWords) {
		if (
			!isDoctorOnboardingPhoneRefusal(onboardingRefusal(422, `Validation Error: ${words}`, 'EC422'))
		) {
			findings.push(`validators: «${words}» is no longer the sign-up’s phone refusal`);
		}
		if (readBookingRelativeRefusedFields(relativeRefusal(words)).join() !== 'phone') {
			findings.push(`validators: «${words}» no longer marks a relative’s mobile`);
		}
	}

	// The names' rule (`onlyCharactersSchema`): the two names of a relative.
	const namesRule = between(
		source.validators,
		'export const onlyCharactersSchema',
		'export const onlyNumbersSchema'
	);
	const names = /"string\.pattern\.base":\s*"([^"]+)"/u.exec(namesRule)?.[1];
	if (!names) findings.push('validators: the names’ rule has no message');
	else if (
		readBookingRelativeRefusedFields(relativeRefusal(names)).join() !== 'firstName,lastName'
	) {
		findings.push(`validators: «${names}» no longer marks a relative’s names`);
	}

	// ΑΜΚΑ / ΑΦΜ: the field name the relative passes, at the head of each message of `GreekIdPolicy`.
	for (const [method, next, field] of [
		['normalizeOptionalAmka', 'normalizeOptionalAfm', 'amka'],
		['normalizeOptionalAfm', 'normalizeOptionalDigits', 'afm']
	] as const) {
		const passed = new RegExp(`${method}\\(v, draft\\.${field}, "(\\w+)"\\)`, 'u').exec(
			source.relative
		)?.[1];
		const templates = [
			...between(source.greekId, `static ${method}`, `static ${next}`).matchAll(
				/addError\(`\$\{field\} ([^`]+)`\)/gu
			)
		].map((match) => match[1]);
		if (!passed || templates.length === 0) {
			findings.push(`relative: the ${field} field or its messages are gone`);
			continue;
		}
		const marked = findings.length;
		for (const template of templates) {
			const refused = readBookingRelativeRefusedFields(relativeRefusal(`${passed} ${template}`));
			if (refused.join() !== field) {
				findings.push(`relative: «${passed} ${template}» no longer marks the ${field}`);
			}
		}
		// 🔴 U-121.3: the first message is the length's, the second the date's / the check digit's — only that one
		// says «δεν είναι έγκυρο» under the field (a field no longer marked at all is reported above, once).
		if (findings.length > marked) continue;
		if (templates.length !== 2) {
			findings.push(`relative: the ${field} has ${templates.length} messages, not 2`);
			continue;
		}
		templates.forEach((template, index) => {
			const invalid = readBookingRelativeInvalidIds(relativeRefusal(`${passed} ${template}`));
			if (invalid.join() !== (index === 1 ? field : '')) {
				findings.push(
					`relative: «${passed} ${template}» is ${index === 1 ? 'no longer' : 'now'} read as an invalid ${field}`
				);
			}
		});
	}

	return findings;
}

describe('W8 Delta 2: the server’s words the client reads are still the server’s', () => {
	it('W8 Delta 2: the registration lock, the phone rule, the names’ rule and the ΑΜΚΑ / ΑΦΜ messages, read from the backend’s files, are each recognized by the client’s readers', () => {
		const source = backendWords();
		expect(Object.values(source).every((text) => text.length > 0)).toBe(true);
		expect(serverWordFindings(source)).toEqual([]);
	});

	it('W8 Delta 2 (negative, planted): a server that says it otherwise is reported — each change on its own line', () => {
		const real = backendWords();
		const planted: BackendWords = {
			onboarding: real.onboarding.replace('registration is locked', 'Registration is locked'),
			validators: real.validators
				.replace(
					'Μη έγκυρος κωδικός χώρας για το τηλέφωνο.',
					'Μη έγκυρος κωδικός χώρας για τον αριθμό.'
				)
				.replace('μόνο γράμματα', 'μόνο χαρακτήρες'),
			greekId: real.greekId,
			relative: real.relative.replace('draft.amka, "amka"', 'draft.amka, "socialSecurity"')
		};
		const findings = serverWordFindings(planted);
		expect(findings.some((line) => line.startsWith('onboarding:'))).toBe(true);
		expect(findings.some((line) => line.includes('τον αριθμό'))).toBe(true);
		expect(findings.some((line) => line.includes('μόνο χαρακτήρες'))).toBe(true);
		expect(findings.some((line) => line.includes('socialSecurity'))).toBe(true);
		expect(findings).toHaveLength(6);
	});

	it('U-121.3 (negative, planted): a server whose ΑΜΚΑ date or ΑΦΜ check digit says it otherwise is reported — the length’s words never read as «δεν είναι έγκυρο»', () => {
		const real = backendWords();
		const planted: BackendWords = {
			...real,
			greekId: real.greekId
				.replace('has an invalid date prefix.', 'has a wrong date.')
				.replace('is not a valid Greek tax identification number.', 'has a wrong check digit.')
		};
		const findings = serverWordFindings(planted);
		expect(findings.some((line) => line.includes('amka has a wrong date.'))).toBe(true);
		expect(findings.some((line) => line.includes('afm has a wrong check digit.'))).toBe(true);
		expect(findings).toHaveLength(2);
		expect(
			readBookingRelativeInvalidIds(relativeRefusal('amka must be exactly 11 digits.'))
		).toEqual([]);
		expect(readBookingRelativeInvalidIds(relativeRefusal('afm must be exactly 9 digits.'))).toEqual(
			[]
		);
	});
});
