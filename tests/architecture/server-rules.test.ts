import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	AFM_LENGTH,
	AMKA_LENGTH,
	greekIdDigits,
	LETTERS_ONLY_PATTERN,
	Validators
} from '$shared/lib/form';
import { projectRoot } from './source-scan';

/**
 * 🔴 U-121.2 / U-121.3: the rules the client checks before a relative is written are the server's own, read where they
 * live (the backend's files, as production and mock run them; the Κ-1 and W8 Delta 2 guards' way). The names' rule
 * must be the same WHOLE chain — the Joi schema's every rule, `validateSingle`'s every step — its pattern character for
 * character, agreeing on every vector; `GreekIdPolicy`'s reading of the digits, its date and its check digit are run
 * from the policy's own text beside the client's, on the same vectors. A server that says it otherwise fails here
 * (S-22: ask), never the client silently.
 */
type BackendRules = {
	validators: string;
	validator: string;
	namePolicy: string;
	relative: string;
	greekId: string;
};

const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');

const backendRules = (): BackendRules => ({
	validators: readBackend('src/shared/utils/validators/validator-schemas.ts'),
	validator: readBackend('src/shared/utils/validators/validator.ts'),
	namePolicy: readBackend('src/shared/domain/policies/name/Policy.ts'),
	relative: readBackend('src/modules/patient/domain/entities/relative/Entity.ts'),
	greekId: readBackend('src/shared/domain/policies/greek-id/Policy.ts')
});

/** The text from `start` up to `end` (empty when either is gone, which the checks then report). */
function between(text: string, start: string, end: string): string {
	const from = text.indexOf(start);
	const to = from < 0 ? -1 : text.indexOf(end, from + start.length);
	return from < 0 || to < 0 ? '' : text.slice(from, to);
}

/** The body of the block that opens right after `head`, braces matched (empty when `head` is gone). */
function bodyAfter(text: string, head: string): string {
	const at = text.indexOf(head);
	if (at < 0) return '';
	const open = text.indexOf('{', at + head.length);
	let depth = 0;
	for (let index = open; index >= 0 && index < text.length; index += 1) {
		if (text[index] === '{') depth += 1;
		if (text[index] === '}' && --depth === 0) return text.slice(open + 1, index);
	}
	return '';
}

/** A body's statements, its white space folded (so a re-indent is no change, a new step is). */
const statementsOf = (body: string) =>
	body
		.split(';')
		.map((statement) => statement.replace(/\s+/gu, ' ').trim())
		.filter(Boolean);

/** The ONE chain the client copies: a string, its pattern, required — then only its messages. */
const NAMES_CHAIN = ['pattern', 'required'];

/** `validateSingle`, step by step: trim, «is required.», the letters' rule, the trimmed value back. */
const VALIDATE_SINGLE = [
	'const trimmed = value?.trim?.() ?? ""',
	'v.exists({ [field]: trimmed })',
	'v.validateCharactersOnly(trimmed)',
	'return trimmed'
];

/**
 * Whether an 11-digit number passes Luhn (the ΑΜΚΑ's real check digit, which the server does not check): from the
 * right, every second digit doubled, its digits summed.
 */
function passesLuhn(digits: string): boolean {
	const sum = [...digits].reverse().reduce((total, digit, index) => {
		const value = Number(digit) * (index % 2 === 1 ? 2 : 1);
		return total + (value > 9 ? value - 9 : value);
	}, 0);
	return sum % 10 === 0;
}

/** The last digit that makes `head` + it FAIL Luhn: the one that passes, plus one. */
function luhnFailingDigit(head: string): string {
	const passing = Array.from({ length: 10 }, (_, digit) => digit).find((digit) =>
		passesLuhn(`${head}${digit}`)
	);
	return String(((passing ?? 0) + 1) % 10);
}

/** Names: a person's, both scripts, polytonic, and what the rule refuses — a space, a hyphen, an apostrophe… */
const NAME_VECTORS = [
	'Anna',
	'Παππά',
	'ΆΝΝΑ',
	'Ἀλέξανδρος',
	'ϊΰ',
	'Κύματος Τρία',
	'Anna-Maria',
	"O'Brien",
	'O’Brien',
	'Anna2',
	'<b>x</b>',
	'Анна',
	'آنا',
	'Anna🙂',
	'An\u0000na',
	'Άννα\u0301',
	'x'
];

// Synthetic ΑΜΚΑ (w3-w9 r1 MINOR-2): every DDMM from 0000 to 9999, then 901234 and a last digit that FAILS Luhn — so
// none can be a person's number, and the server, which checks no Luhn, reads each as the client does.
const AMKA_VECTORS = Array.from({ length: 10_000 }, (_, index) => {
	const head = `${String(index).padStart(4, '0')}901234`;
	return `${head}${luhnFailingDigit(head)}`;
});

// Synthetic ΑΦΜ: eight digits from a fixed sequence, each with all ten last digits (one of them the check digit). Tied
// to no name, and none leaves localhost.
const AFM_VECTORS = Array.from({ length: 300 }, (_, index) =>
	String((index * 7_919_993 + 12_345_678) % 100_000_000).padStart(8, '0')
).flatMap((head) => Array.from({ length: 10 }, (_, last) => `${head}${last}`));

// What a pasted or typed id may hold (NIT-2): spaces, dashes, a country prefix, other scripts' digits, nothing.
const DIGITS_VECTORS = [
	' 0101 9012340 ',
	'0101-9012340',
	'EL 123 456 783',
	'12a3',
	'\t9\n',
	'١٢٣',
	'０１２',
	'abc',
	'   ',
	''
];

/** What of the server's rules the client no longer checks the same way, one line each (none: they still meet). */
function serverRuleFindings(source: BackendRules): string[] {
	const findings: string[] = [];

	// U-121.2 · the names' rule: a relative's two names go through `NamePolicy.validateSingle`, exactly its four steps,
	// then `validateCharactersOnly`, which is `onlyCharactersSchema`: a string, its pattern, required — nothing else.
	for (const field of ['firstName', 'lastName']) {
		if (!source.relative.includes(`NamePolicy.validateSingle(v, draft.${field}, "${field}")`)) {
			findings.push(`relative: the ${field} no longer goes through NamePolicy.validateSingle`);
		}
	}
	const single = statementsOf(bodyAfter(source.namePolicy, 'static validateSingle('));
	if (single.join(' ; ') !== VALIDATE_SINGLE.join(' ; ')) {
		findings.push(`name policy: validateSingle is «${single.join('; ')}», the client's not`);
	}
	const characters = statementsOf(bodyAfter(source.validator, 'validateCharactersOnly('));
	if (characters.join() !== 'this.validate(onlyCharactersSchema, text)') {
		findings.push('validator: validateCharactersOnly is no longer onlyCharactersSchema alone');
	}
	const schema = between(
		source.validators,
		'export const onlyCharactersSchema',
		'export const onlyNumbersSchema'
	);
	const chain = between(schema, 'Joi.string()', '.messages(').slice('Joi.string()'.length);
	const rules = [...chain.matchAll(/\.(\w+)\(/gu)].map((match) => match[1]);
	if (
		!/onlyCharactersSchema = Joi\.string\(\)/u.test(schema) ||
		rules.join() !== NAMES_CHAIN.join()
	) {
		findings.push(
			`validators: onlyCharactersSchema is Joi.string().${rules.join('().')}(), the client's ${NAMES_CHAIN.join(', ')}`
		);
	}
	const literal = /\.pattern\(\/(.+)\/([a-z]*)\)/u.exec(schema);
	if (!literal) findings.push('validators: onlyCharactersSchema has no pattern');
	else {
		const [, pattern, flags] = literal;
		if (pattern !== LETTERS_ONLY_PATTERN.source || flags !== LETTERS_ONLY_PATTERN.flags) {
			findings.push(`validators: the names' pattern is /${pattern}/${flags}, the client's not`);
		}
		const server = new RegExp(pattern, flags);
		const says = (takes: boolean) => (takes ? 'takes' : 'refuses');
		for (const name of NAME_VECTORS) {
			const client = Validators.lettersOnly(name) === null;
			const taken = server.test(name.trim());
			if (taken !== client) {
				findings.push(
					`validators: the server ${says(taken)} «${name}», the client ${says(client)} it`
				);
			}
		}
	}

	// U-121.3 · `GreekIdPolicy`: the lengths, then its reading of the digits, its date and its check digit, run from the
	// policy's own text.
	const amkaLength = /const AMKA_REGEX = \/\^\[0-9\]\{(\d+)\}\$\//u.exec(source.greekId)?.[1];
	const afmLength = /const AFM_REGEX = \/\^\[0-9\]\{(\d+)\}\$\//u.exec(source.greekId)?.[1];
	if (Number(amkaLength) !== AMKA_LENGTH) {
		findings.push(`greek id: an ΑΜΚΑ has ${amkaLength} digits, not ${AMKA_LENGTH}`);
	}
	if (Number(afmLength) !== AFM_LENGTH) {
		findings.push(`greek id: an ΑΦΜ has ${afmLength} digits, not ${AFM_LENGTH}`);
	}
	const months = /const MAX_DAYS_BY_MONTH = (\[[\d,\s]+\]);/u.exec(source.greekId)?.[1];
	const digitsBody = bodyAfter(source.greekId, 'private static normalizeOptionalDigits(');
	const amkaBody = bodyAfter(source.greekId, 'private static isValidAmkaDatePrefix(');
	const afmBody = bodyAfter(source.greekId, 'private static hasValidAfmChecksum(');
	if (!months || !digitsBody || !amkaBody || !afmBody) {
		findings.push('greek id: the reading of the digits, the date check or the check digit is gone');
		return findings;
	}
	// The three private steps hold no type inside their bodies: they run as they are, the table passed in.
	let serverDigits: (raw: string) => string;
	let serverAmka: (amka: string) => boolean;
	let serverAfm: (afm: string) => boolean;
	try {
		const table = JSON.parse(months) as number[];
		const digitsStep = new Function('raw', digitsBody);
		const amkaCheck = new Function('amka', 'MAX_DAYS_BY_MONTH', amkaBody);
		const afmCheck = new Function('afm', afmBody);
		serverDigits = (raw) => String(digitsStep(raw) ?? '');
		serverAmka = (amka) => Boolean(amkaCheck(amka, table));
		serverAfm = (afm) => Boolean(afmCheck(afm));
		serverDigits(DIGITS_VECTORS[0]);
		serverAmka(AMKA_VECTORS[0]);
		serverAfm(AFM_VECTORS[0]);
	} catch (error) {
		findings.push(`greek id: the policy's checks no longer run here (${String(error)})`);
		return findings;
	}
	for (const raw of DIGITS_VECTORS) {
		if (serverDigits(raw) !== greekIdDigits(raw)) {
			findings.push(
				`greek id: the server reads «${raw}» as «${serverDigits(raw)}», the client as «${greekIdDigits(raw)}»`
			);
		}
	}
	const amkaDiffers = AMKA_VECTORS.filter(
		(amka) => serverAmka(amka) !== (Validators.amkaDate(amka) === null)
	);
	if (amkaDiffers.length > 0) {
		findings.push(`greek id: ${amkaDiffers.length} ΑΜΚΑ differ, first ${amkaDiffers[0]}`);
	}
	const afmDiffers = AFM_VECTORS.filter(
		(afm) => serverAfm(afm) !== (Validators.afmCheckDigit(afm) === null)
	);
	if (afmDiffers.length > 0) {
		findings.push(`greek id: ${afmDiffers.length} ΑΦΜ differ, first ${afmDiffers[0]}`);
	}
	return findings;
}

describe('U-121.2 / U-121.3: what the client checks before the write is the server’s rule', () => {
	it('U-121.2 / U-121.3: the names’ whole rule and GreekIdPolicy, read from the backend’s files, meet the client’s validators on every vector', () => {
		const source = backendRules();
		expect(Object.values(source).every((text) => text.length > 0)).toBe(true);
		// The vectors are not empty, and they are both sides of each rule (the scan really compared something).
		const valid = (list: string[], check: (value: string) => unknown) =>
			list.filter((value) => check(value) === null).length;
		expect(valid(NAME_VECTORS, Validators.lettersOnly)).toBe(6);
		expect(valid(AMKA_VECTORS, Validators.amkaDate)).toBe(366);
		expect(valid(AFM_VECTORS, Validators.afmCheckDigit)).toBe(300);
		expect(DIGITS_VECTORS.map(greekIdDigits)).toEqual([
			'01019012340',
			'01019012340',
			'123456783',
			'123',
			'9',
			'',
			'',
			'',
			'',
			''
		]);
		expect(serverRuleFindings(source)).toEqual([]);
	});

	it('U-121.2: one word of letters — «Κύματος Τρία», «Anna-Maria», «O’Brien» are not names for the server, nor the client', () => {
		for (const name of ['Κύματος Τρία', 'Anna-Maria', "O'Brien", 'O’Brien']) {
			expect(Validators.lettersOnly(name), name).toEqual({ lettersOnly: true });
		}
		expect(Validators.lettersOnly(' Κύματος ')).toBeNull();
	});

	it('U-121.2 / U-121.3 (negative, planted): a server that says it otherwise is reported — each change on its own line', () => {
		const real = backendRules();
		const planted: BackendRules = {
			validators: real.validators.replace('\\u1F00-\\u1FFF]+$/', '\\u1F00-\\u1FFF ]+$/'),
			validator: real.validator,
			namePolicy: real.namePolicy,
			relative: real.relative.replace(
				'NamePolicy.validateSingle(v, draft.lastName, "lastName")',
				'TextPolicy.ensure(v, draft.lastName, "lastName")'
			),
			greekId: real.greekId
				.replace('[31, 29, 31,', '[31, 28, 31,')
				.replace('(weightedSum % 11) % 10', 'weightedSum % 11')
		};
		const findings = serverRuleFindings(planted);
		expect(findings.some((line) => line.startsWith('relative: the lastName'))).toBe(true);
		expect(findings.some((line) => line.includes("the names' pattern is"))).toBe(true);
		expect(findings.some((line) => line.includes('«Κύματος Τρία»'))).toBe(true);
		expect(findings.some((line) => line.includes('ΑΜΚΑ differ, first 2902'))).toBe(true);
		expect(findings.some((line) => line.includes('ΑΦΜ differ'))).toBe(true);
		expect(findings).toHaveLength(5);
	});

	it('W9 Delta 1 · MINOR-1 (negative, planted): a limit or a step added to the names’ chain — `.max(50)`, `.min(2)`, `.trim()` — is reported on its own line', () => {
		const real = backendRules();
		for (const [rule, chain] of [
			['.max(50)', 'pattern().max().required'],
			['.min(2)', 'pattern().min().required'],
			['.trim()', 'pattern().trim().required']
		] as const) {
			const findings = serverRuleFindings({
				...real,
				validators: real.validators.replace(
					'\\u1F00-\\u1FFF]+$/)\n  .required()',
					`\\u1F00-\\u1FFF]+$/)\n  ${rule}\n  .required()`
				)
			});
			expect(findings, rule).toEqual([
				`validators: onlyCharactersSchema is Joi.string().${chain}(), the client's pattern, required`
			]);
		}
	});

	it('W9 Delta 1 · MINOR-1 (negative, planted): a step added to `validateSingle` — a normalization, another check — is reported on its own line', () => {
		const real = backendRules();
		for (const [from, to] of [
			['value?.trim?.() ?? ""', 'value?.trim?.().normalize("NFC") ?? ""'],
			[
				'v.validateCharactersOnly(trimmed);',
				'v.validateCharactersOnly(trimmed);\n    v.maxLength(trimmed, 50);'
			]
		] as const) {
			const findings = serverRuleFindings({
				...real,
				namePolicy: real.namePolicy.replace(from, to)
			});
			expect(findings, to).toHaveLength(1);
			expect(findings[0], to).toMatch(/^name policy: validateSingle is «.+», the client's not$/u);
		}
	});

	it('W9 Delta 1 · NIT-2 (negative, planted): a server that reads the digits otherwise is reported', () => {
		const real = backendRules();
		const findings = serverRuleFindings({
			...real,
			greekId: real.greekId.replace("replace(/[^0-9]/g, '')", "replace(/\\s/g, '')")
		});
		expect(findings.length).toBeGreaterThan(0);
		expect(findings.every((line) => line.startsWith('greek id: the server reads «'))).toBe(true);
	});

	it('w3-w9 r1 MINOR-2: every ΑΜΚΑ of the guard’s vectors FAILS Luhn, the 366 dated ones too', () => {
		expect(AMKA_VECTORS.filter(passesLuhn)).toEqual([]);
		expect(AMKA_VECTORS.filter((amka) => Validators.amkaDate(amka) === null)).toHaveLength(366);
		// The check itself: Luhn's own textbook number passes (built here, so no file holds it).
		expect(passesLuhn(['7992739871', '3'].join(''))).toBe(true);
	});
});

/** Every source, spec, sample, harness and story of the web that speaks of the ΑΜΚΑ (not the generated output). */
function filesOnAmka(): { path: string; text: string }[] {
	const files: { path: string; text: string }[] = [];
	const walk = (directory: string) => {
		for (const entry of readdirSync(directory)) {
			const absolute = join(directory, entry);
			const path = relative(projectRoot, absolute).split('\\').join('/');
			if (statSync(absolute).isDirectory()) {
				if (path !== 'src/generated') walk(absolute);
				continue;
			}
			if (!/\.(ts|svelte|json)$/u.test(path)) continue;
			const text = readFileSync(absolute, 'utf8');
			if (/amka|ΑΜΚΑ/iu.test(text)) files.push({ path, text });
		}
	};
	walk(join(projectRoot, 'src'));
	walk(join(projectRoot, 'tests'));
	return files;
}

/** The 11-digit numbers of these files that PASS Luhn (one line each: none, when every ΑΜΚΑ is synthetic). */
function luhnValidAmkas(files: readonly { path: string; text: string }[]): string[] {
	return files.flatMap(({ path, text }) =>
		[...text.matchAll(/(?<!\d)\d{11}(?!\d)/gu)]
			.filter((match) => passesLuhn(match[0]))
			.map((match) => `${path}:${text.slice(0, match.index).split('\n').length} ${match[0]}`)
	);
}

describe('w3-w9 r1 MINOR-2: every ΑΜΚΑ the web writes in a file fails Luhn — none can be a person’s', () => {
	it('w3-w9 r1 MINOR-2: no 11-digit number of a file on the ΑΜΚΑ passes Luhn', () => {
		const files = filesOnAmka();
		expect(files.length).toBeGreaterThan(5);
		expect(files.some((file) => file.text.includes('01019012345'))).toBe(true);
		expect(luhnValidAmkas(files)).toEqual([]);
	});

	it('w3-w9 r1 MINOR-2 (negative, planted): a dated ΑΜΚΑ that passes Luhn is reported with its line; its failing twin is not', () => {
		const passing = ['3112901234', '5'].join('');
		const failing = ['3112901234', '6'].join('');
		expect(passesLuhn(passing)).toBe(true);
		expect(
			luhnValidAmkas([{ path: 'planted.test.ts', text: `amka\n'${passing}'\n'${failing}'` }])
		).toEqual([`planted.test.ts:2 ${passing}`]);
	});
});
