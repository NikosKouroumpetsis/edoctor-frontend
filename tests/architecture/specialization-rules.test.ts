// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapDoctorSpecializationOptions } from '$modules/doctor-dashboard/api/specializations';
import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';
import { projectRoot, readSourceFiles } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 80 (U-209.3, D-W52-54, D-W52-60): the rules the web states before a save of the specializations
 * are the server's own, read where they live (the backend's files, the `appointment-rules` way) — the limit of three
 * and the shape of a catalogue code. A server that says them otherwise fails here (S-22: ask), never the client
 * silently. And the mark the specializations replaced is gone from the web for good.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

const POLICY = 'src/modules/doctor/domain/policies/specialization/Policy.ts';
const CATALOGUE = 'src/shared/config/specializations/index.ts';

/** The number the server's policy keeps as its limit, `null` when it no longer says it this way. */
function serverLimit(policy: string): number | null {
	const match = /export const DOCTOR_SPECIALIZATION_LIMIT = (\d+);/u.exec(policy);
	return match ? Number(match[1]) : null;
}

/** The pattern of a catalogue code as the server writes it, `null` when it no longer says it this way. */
function serverCodePattern(catalogue: string): string | null {
	return /export const SPECIALIZATION_CODE_PATTERN = '([^']+)';/u.exec(catalogue)?.[1] ?? null;
}

function limitFindings(policy: string): string[] {
	const limit = serverLimit(policy);
	if (limit === null) return [`${POLICY}: no DOCTOR_SPECIALIZATION_LIMIT`];
	return limit === DOCTOR_SPECIALIZATION_LIMIT
		? []
		: [`the server keeps ${limit} specializations, the web ${DOCTOR_SPECIALIZATION_LIMIT}`];
}

/** Codes on both sides of the server's pattern: the web's reader must take exactly those the server takes. */
const CODE_VECTORS = [
	'PR011-03',
	'PR000-00',
	'PR999-99',
	'PR011-3',
	'PR11-03',
	'PR0110-03',
	'PR011-030',
	'pr011-03',
	'PR011_03',
	'PR011-0a',
	' PR011-03',
	'PR011-03 ',
	'XPR011-03',
	''
];

function codeFindings(catalogue: string): string[] {
	const pattern = serverCodePattern(catalogue);
	if (pattern === null) return [`${CATALOGUE}: no SPECIALIZATION_CODE_PATTERN`];
	const server = new RegExp(pattern, 'u');
	return CODE_VECTORS.flatMap((code) => {
		const taken =
			mapDoctorSpecializationOptions([{ code, name: 'Γραμμή', kind: 'SOCIETY_AREA' }])?.length ===
			1;
		return taken === server.test(code)
			? []
			: [
					`«${code}»: the server ${server.test(code) ? 'takes' : 'refuses'} it, the web does not agree`
				];
	});
}

/**
 * 🔴 D-W52-60: the old mark of a service is written by the generated contract alone (the doctor's own list of services
 * still answers the column) — by no code of `src/` (comments are not read, specs are not scanned).
 */
function markFindings(files: { path: string; text: string }[]): string[] {
	return files
		.filter((file) => /isSpecialized/u.test(file.text))
		.map((file) => `${file.path}: isSpecialized`);
}

describe('the rules of the specializations are the server’s own (wave 5.2 · screen 80)', () => {
	it('🔴 U-209.3 · D-W52-54: the limit of three is the server’s `DOCTOR_SPECIALIZATION_LIMIT`', () => {
		expect(limitFindings(readBackend(POLICY))).toEqual([]);
	});

	it('🔴 D-W52-54 · U-65.6: the web reads a catalogue code exactly as the server’s pattern does', () => {
		expect(codeFindings(readBackend(CATALOGUE))).toEqual([]);
	});

	it('(negative, planted) another limit, another pattern, or a server that no longer says them is reported', () => {
		expect(limitFindings('export const DOCTOR_SPECIALIZATION_LIMIT = 5;')).toEqual([
			'the server keeps 5 specializations, the web 3'
		]);
		expect(limitFindings('const LIMIT = 3;')).toEqual([
			`${POLICY}: no DOCTOR_SPECIALIZATION_LIMIT`
		]);
		expect(
			codeFindings("export const SPECIALIZATION_CODE_PATTERN = '^PR[0-9]{2}-[0-9]{2}$';")
		).not.toEqual([]);
		expect(codeFindings('const PATTERN = 1;')).toEqual([
			`${CATALOGUE}: no SPECIALIZATION_CODE_PATTERN`
		]);
	});

	it('🔴 U-209.3 · D-W52-56 / 60: no source file of the web writes `isSpecialized` — a service is never a field of expertise again', () => {
		const files = readSourceFiles();
		expect(files.length).toBeGreaterThan(500);
		expect(markFindings(files)).toEqual([]);
	});

	it('(negative, planted) a file that reads the old mark is reported', () => {
		expect(
			markFindings([
				{ path: 'src/modules/doctor/api/profile/map.ts', text: 'service.isSpecialized === true' },
				{ path: 'src/modules/doctor/lib/detail/index.ts', text: 'const fields = specializations;' }
			])
		).toEqual(['src/modules/doctor/api/profile/map.ts: isSpecialized']);
	});
});
