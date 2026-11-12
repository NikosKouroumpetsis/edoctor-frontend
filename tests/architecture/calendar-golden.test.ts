import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	APPOINTMENT_CALENDAR_ABSENT_VALUE,
	appointmentCalendarLocation,
	serializeAppointmentIcs,
	type AppointmentIcsInput
} from '$modules/appointments/lib/calendar';
import { bodyAfter, projectRoot } from './source-scan';

/**
 * 🔴 D-W4-31 (P-W4 §8.3, P-B4-review m-4 / 5 (γ)): the web's `.ics` is the email's, byte for byte — its builder runs on
 * the backend's own golden vectors, read where they live (`server-rules`' way). A change of the email's calendar (a
 * property, an escape, the fold) fails here, never the patient's calendar silently. Only the `PUBLISH` vectors: the web
 * never cancels (no email does, m-4), and its own file is `SEQUENCE:0` (the builder takes the vector's).
 */
const GOLDEN = '../backend/src/modules/notification/domain/helpers/ics/__fixtures__/ics-golden';

type Golden = { name: string; input: AppointmentIcsInput & { method: string }; ics: string };

const readGolden = (name: string): Golden =>
	JSON.parse(readFileSync(join(projectRoot, GOLDEN, `${name}.json`), 'utf8')) as Golden;

/** A vector's input as the web's builder takes it (its method is the web's own `PUBLISH`). */
const inputOf = ({ input }: Golden): AppointmentIcsInput => ({
	appointmentId: input.appointmentId,
	startTime: input.startTime,
	endTime: input.endTime,
	summary: input.summary,
	location: input.location,
	description: input.description,
	sequence: input.sequence,
	dtstamp: input.dtstamp
});

describe('🔴 D-W4-31 · the browser’s calendar file is the email’s (the backend’s golden vectors)', () => {
	it('the vectors are where the backend keeps them, and the two PUBLISH ones are read whole', () => {
		const names = readdirSync(join(projectRoot, GOLDEN)).sort();
		expect(names).toEqual(['cancel.json', 'publish.json', 'reschedule.json']);
		for (const name of ['publish', 'reschedule']) {
			const golden = readGolden(name);
			expect(golden.input.method).toBe('PUBLISH');
			expect(golden.ics).toContain('\r\n ');
		}
		expect(readGolden('cancel').input.method).toBe('CANCEL');
	});

	it.each(['publish', 'reschedule'])(
		'reproduces the email’s «%s» calendar byte for byte',
		(name) => {
			const golden = readGolden(name);
			expect(serializeAppointmentIcs(inputOf(golden))).toBe(golden.ics);
		}
	);

	it('(negative, planted) a calendar that drifts from a vector is told apart', () => {
		const golden = readGolden('publish');
		const input = inputOf(golden);
		expect(serializeAppointmentIcs({ ...input, sequence: 1 })).not.toBe(golden.ics);
		expect(serializeAppointmentIcs({ ...input, location: `${input.location};` })).not.toBe(
			golden.ics
		);
	});

	it('an office with no address: the email’s «—» in the same place of the same file (D-W4-31, no known difference)', () => {
		const golden = readGolden('publish');
		const place = appointmentCalendarLocation(null, 'el');
		expect(place).toBe('—');
		const ics = serializeAppointmentIcs({ ...inputOf(golden), location: place }) ?? '';
		expect(ics).toContain('\r\nLOCATION:—\r\n');
		// The email's file with its place swapped for «—», every other line as it is (the fold is the vectors' own).
		const unfold = (text: string) => text.replace(/\r\n /gu, '');
		expect(unfold(ics)).toBe(unfold(golden.ics).replace(/^LOCATION:.*$/mu, 'LOCATION:—'));
	});

	it('(negative, NIT-4 of the review w4-w4 R1) the builder writes no method but `PUBLISH`, whatever it is handed', () => {
		const golden = readGolden('cancel');
		const handed = { ...inputOf(golden), method: golden.input.method } as AppointmentIcsInput;
		const ics = serializeAppointmentIcs(handed) ?? '';
		expect(ics).toContain('BEGIN:VEVENT');
		expect(ics.match(/^METHOD:.*$/gmu)).toEqual(['METHOD:PUBLISH']);
		expect(ics).not.toMatch(/METHOD:(CANCEL|REQUEST)|STATUS:CANCELLED/u);
		const builder = readFileSync(join(projectRoot, CALENDAR), 'utf8');
		expect(builder.match(/'METHOD:[A-Z]*'/gu)).toEqual(["'METHOD:PUBLISH'"]);
	});
});

/*
 * 🔴 P-B4-review 5 (γ) (review w4-w4 R1 MINOR-4): the event's place is the email's — `appointmentCalendarLocation` is
 * the third copy of the backend's `formatOfficeAddress`, and the vectors carry a ready `location`, so the RULE is read
 * from the backend where it lives (`server-rules`' way): its every step, in the web's copy too. A step the backend adds
 * or changes (a floor, the region, another language first) fails here (S-22: ask), never the calendar silently. With no
 * address at all both write the email's «—» (`NOTIFICATION_ABSENT_VALUE`, its value read where it lives): no known
 * difference is left (the orchestrator, 11/11 03:1x, D-W4-31 «byte for byte»).
 */
const PAYLOAD = '../backend/src/modules/notification/domain/helpers/appointment-payload/index.ts';
const ABSENT = '../backend/src/modules/notification/domain/templates/reason-labels/index.ts';
const CALENDAR = 'src/modules/appointments/lib/calendar/index.ts';

/** The code with no white space outside its quotes (a re-indent is no change, `' '` stays a space). */
function squash(code: string): string {
	let out = '';
	let quote = '';
	for (const char of code) {
		if (quote) {
			out += char;
			if (char === quote) quote = '';
		} else if (char === "'" || char === '"' || char === '`') {
			quote = char;
			out += char;
		} else if (!/\s/u.test(char)) out += char;
	}
	return out;
}

/**
 * A body in ONE vocabulary: the office as `office`, the language as `locale`, its translations as `translations`, the
 * value of a place it does not have as `ABSENT`.
 */
function addressRule(
	body: string,
	names: { office: string; locale: string; absent: string }
): string {
	// The absent value by its name before the white space goes (squashed, `return X` is one word: `returnX`).
	return squash(body.replace(new RegExp(`\\b${names.absent}\\b`, 'gu'), 'ABSENT'))
		.replace(new RegExp(`(?<![.\\w])${names.office}(?!\\w)`, 'gu'), 'office')
		.replace(new RegExp(`(?<![.\\w])${names.locale}(?!\\w)`, 'gu'), 'locale')
		.replaceAll('office.translations', 'translations');
}

/**
 * The rule, step by step: no office ⇒ «—»; the page's language, else the Greek, else the first; the three parts;
 * trimmed; joined — «—» when none is left.
 */
const ADDRESS_STEPS = [
	'if(!office){returnABSENT;}',
	"consttranslation=translations.find((entry)=>entry.language===locale)??translations.find((entry)=>entry.language==='el')??translations[0]??null;",
	'conststreet=translation?.street??office.street;',
	'conststreetNumber=translation?.streetNumber??office.streetNumber;',
	'constcity=translation?.city??office.city;',
	"[[street,streetNumber].filter(Boolean).join(' '),city,office.postalCode].map((part)=>(typeofpart==='string'?part.trim():'')).filter((part)=>part.length>0)",
	"returnparts.length>0?parts.join(', '):ABSENT;"
];
/** The backend's names, all of them: one more is a step the web's copy does not know. */
const BACKEND_NAMES = ['translations', 'translation', 'street', 'streetNumber', 'city', 'parts'];

/** What sets the two copies apart (empty when the web's says the backend's rule). */
function addressFindings(backend: string, web: string): string[] {
	const theirs = addressRule(bodyAfter(backend, 'function formatOfficeAddress('), {
		office: 'snapshot',
		locale: 'language',
		absent: 'NOTIFICATION_ABSENT_VALUE'
	});
	const ours = addressRule(bodyAfter(web, 'export function appointmentCalendarLocation('), {
		office: 'office',
		locale: 'locale',
		absent: 'APPOINTMENT_CALENDAR_ABSENT_VALUE'
	});
	const findings: string[] = [];
	if (!theirs) findings.push('backend: formatOfficeAddress is gone');
	if (!ours) findings.push('web: appointmentCalendarLocation is gone');
	for (const step of ADDRESS_STEPS) {
		if (!theirs.includes(step)) findings.push(`backend: ${step}`);
		if (!ours.includes(step)) findings.push(`web: ${step}`);
	}
	const names = [...theirs.matchAll(/const(\w+)=/gu)].map((match) => match[1]);
	if (names.join() !== BACKEND_NAMES.join()) findings.push(`backend names: ${names.join()}`);
	return findings;
}

describe('🔴 P-B4-review 5 (γ) · the calendar’s place is the email’s address (the backend’s `formatOfficeAddress`)', () => {
	const backend = () => readFileSync(join(projectRoot, PAYLOAD), 'utf8');
	const web = () => readFileSync(join(projectRoot, CALENDAR), 'utf8');

	it('the web’s copy says every step of the backend’s rule, and the backend has no step the copy does not know', () => {
		expect(addressFindings(backend(), web())).toEqual([]);
	});

	it('«—» for a place it does not have is the email’s own value, read where the backend keeps it', () => {
		const declared = readFileSync(join(projectRoot, ABSENT), 'utf8').match(
			/export const NOTIFICATION_ABSENT_VALUE = '([^']*)';/u
		);
		expect(declared?.[1]).toBe(APPOINTMENT_CALENDAR_ABSENT_VALUE);
	});

	it('(negative, planted) a floor, the region, another language first, a step more or one untrimmed part are told apart', () => {
		const theirs = backend();
		const ours = web();
		const planted: [string, string][] = [
			[
				theirs.replace('city, snapshot.postalCode]', 'city, snapshot.postalCode, snapshot.state]'),
				ours
			],
			[theirs.replace("entry.language === 'el'", "entry.language === 'en'"), ours],
			[
				theirs.replace(
					'const city = translation?.city ?? snapshot.city;',
					'const city = translation?.city ?? snapshot.city;\n  const floor = snapshot.floor;'
				),
				ours
			],
			[theirs.replace("parts.join(', ')", "parts.join(' · ')"), ours],
			[theirs, ours.replace("part.trim() : ''", "part : ''")],
			[theirs, ours.replace(': APPOINTMENT_CALENDAR_ABSENT_VALUE;\n}', ": '';\n}")],
			[theirs.replace('if (!snapshot) {', 'if (!snapshot?.street) {'), ours],
			[theirs.replace('function formatOfficeAddress(', 'function formatOfficeLines('), ours]
		];
		for (const [backendText, webText] of planted) {
			expect(backendText === theirs && webText === ours, 'the plant took').toBe(false);
			expect(addressFindings(backendText, webText).length).toBeGreaterThan(0);
		}
	});
});
