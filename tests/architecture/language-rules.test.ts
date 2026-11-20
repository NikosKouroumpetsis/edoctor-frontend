// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapDoctorLanguageOptions } from '$modules/doctor-dashboard/api/languages';
import { DOCTOR_LINK_FIELDS } from '$modules/doctor-dashboard/api/links';
import {
	DOCTOR_LINK_MAX_LENGTH,
	DOCTOR_LINK_NETWORK_HOSTS,
	DOCTOR_SPEAK_LANGUAGE_GREEK_CODE,
	DOCTOR_SPEAK_LANGUAGE_LIMIT
} from '$modules/doctor-dashboard/config';
import { doctorLinkMessages } from '$modules/doctor-dashboard/lib/links';
import { projectRoot, readSourceFiles, type SourceFile } from './source-scan';

/**
 * 🔴 Wave 5.2 · screen 82 (U-211, D-W52-64 … 70): the rules the web states before a save of the languages and of the
 * four links are the server's own, read where they live (the backend's files, the `appointment-rules` way) — the limit
 * of ten, the shape of a catalogue code, Greek's code, the longest link, the names of each network, the reasons of a
 * refusal and the patterns the check is made of. A server that says them otherwise fails here (S-22: ask), never the
 * client silently. And a kept link is never an address the doctor's pages open.
 */
const readBackend = (path: string) => readFileSync(join(projectRoot, '../backend', path), 'utf8');
const readWeb = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

const LANGUAGE_POLICY = 'src/modules/doctor/domain/policies/speak-language/Policy.ts';
const CATALOGUE = 'src/shared/config/speak-language/index.ts';
const LINK_POLICY = 'src/modules/doctor/domain/policies/social-link/Policy.ts';
const TEXT_POLICY = 'src/shared/domain/policies/plain-text/Policy.ts';
const WEB_LINKS = 'src/modules/doctor-dashboard/lib/links/index.ts';

const numberOf = (text: string, name: string): number | null => {
	const match = new RegExp(`export const ${name} = (\\d+);`, 'u').exec(text);
	return match ? Number(match[1]) : null;
};
const wordOf = (text: string, name: string): string | null =>
	new RegExp(`export const ${name} = '([^']+)';`, 'u').exec(text)?.[1] ?? null;

function limitFindings(policy: string): string[] {
	const limit = numberOf(policy, 'DOCTOR_SPEAK_LANGUAGE_LIMIT');
	if (limit === null) return [`${LANGUAGE_POLICY}: no DOCTOR_SPEAK_LANGUAGE_LIMIT`];
	return limit === DOCTOR_SPEAK_LANGUAGE_LIMIT
		? []
		: [`the server keeps ${limit} languages, the web ${DOCTOR_SPEAK_LANGUAGE_LIMIT}`];
}

/** Codes on both sides of the server's pattern: the web's reader must take exactly those the server takes. */
const CODE_VECTORS = [
	'SL001',
	'SL000',
	'SL999',
	'SL01',
	'SL0001',
	'sl001',
	'SL00a',
	'SL-01',
	'PR003',
	' SL001',
	'SL001 ',
	'XSL001',
	''
];

function codeFindings(catalogue: string): string[] {
	const pattern = wordOf(catalogue, 'SPEAK_LANGUAGE_CODE_PATTERN');
	if (pattern === null) return [`${CATALOGUE}: no SPEAK_LANGUAGE_CODE_PATTERN`];
	const server = new RegExp(pattern.replaceAll('\\\\', '\\'));
	const findings = CODE_VECTORS.flatMap((code) => {
		const taken =
			mapDoctorLanguageOptions([{ code, name: 'Γλώσσα', normalized: 'γλωσσα' }])?.length === 1;
		return taken === server.test(code)
			? []
			: [
					`«${code}»: the server ${server.test(code) ? 'takes' : 'refuses'} it, the web does not agree`
				];
	});
	const greek = wordOf(catalogue, 'SPEAK_LANGUAGE_GREEK_CODE');
	if (greek === null) findings.push(`${CATALOGUE}: no SPEAK_LANGUAGE_GREEK_CODE`);
	else if (greek !== DOCTOR_SPEAK_LANGUAGE_GREEK_CODE) {
		findings.push(
			`Greek is ${greek} on the server, ${DOCTOR_SPEAK_LANGUAGE_GREEK_CODE} on the web`
		);
	}
	return findings;
}

type Hosts = Record<string, { host: string; subdomains: boolean }[]>;

/** The server's `NETWORK_HOSTS`, network by network, as its policy writes them; `null` when it no longer does. */
function serverHosts(policy: string): Hosts | null {
	const table = /const NETWORK_HOSTS[^=]*=\s*\{([\s\S]*?)\n\};/u.exec(policy)?.[1];
	if (table === undefined) return null;
	const hosts: Hosts = {};
	for (const [, network, lines] of table.matchAll(/(\w+): \[([\s\S]*?)\],?(?=\n|$)/gu)) {
		hosts[network] = [...lines.matchAll(/\{ host: '([^']+)', subdomains: (true|false) \}/gu)].map(
			([, host, subdomains]) => ({ host, subdomains: subdomains === 'true' })
		);
	}
	return hosts;
}

/** The names of a `const X = { A: 'A', … } as const` / `[ 'a', … ] as const` of the server's, in its order. */
const listOf = (text: string, head: string): string[] | null => {
	const body = new RegExp(`${head}\\s*=\\s*[\\[{]([\\s\\S]*?)[\\]}] as const`, 'u').exec(text)?.[1];
	return body === undefined ? null : [...body.matchAll(/'([^']+)'/gu)].map(([, word]) => word);
};

function linkFindings(policy: string): string[] {
	const findings: string[] = [];
	const longest = numberOf(policy, 'DOCTOR_SOCIAL_LINK_MAX_LENGTH');
	if (longest === null) findings.push(`${LINK_POLICY}: no DOCTOR_SOCIAL_LINK_MAX_LENGTH`);
	else if (longest !== DOCTOR_LINK_MAX_LENGTH) {
		findings.push(`the server keeps a link of ${longest}, the web ${DOCTOR_LINK_MAX_LENGTH}`);
	}
	const fields = listOf(policy, 'export const DOCTOR_SOCIAL_LINK_FIELDS');
	if (fields === null) findings.push(`${LINK_POLICY}: no DOCTOR_SOCIAL_LINK_FIELDS`);
	else if (JSON.stringify(fields) !== JSON.stringify(DOCTOR_LINK_FIELDS)) {
		findings.push(`the server's fields are ${fields.join(', ')}`);
	}
	const hosts = serverHosts(policy);
	if (hosts === null) findings.push(`${LINK_POLICY}: no NETWORK_HOSTS`);
	else if (JSON.stringify(hosts) !== JSON.stringify(DOCTOR_LINK_NETWORK_HOSTS)) {
		findings.push(`the server's networks live on ${JSON.stringify(hosts)}`);
	}
	const refusals = listOf(policy, 'export const DoctorSocialLinkRefusal');
	const known = Object.keys(doctorLinkMessages('el').website);
	if (refusals === null) findings.push(`${LINK_POLICY}: no DoctorSocialLinkRefusal`);
	else if ([...new Set(refusals)].sort().join() !== [...known].sort().join()) {
		findings.push(`the server refuses for ${[...new Set(refusals)].join(', ')}`);
	}
	return findings;
}

/** The source of the pattern a `const NAME = /…/flags;` keeps, `null` when the file no longer says it this way. */
const patternOf = (text: string, name: string): string | null =>
	new RegExp(`const ${name} =\\s*(?://[^\\n]*\\n\\s*)?/(.+)/[a-z]*;`, 'u').exec(text)?.[1] ?? null;

/** The patterns the check is made of, server's name ⇒ web's name: the same characters on both sides. */
const SHARED_PATTERNS: [server: string, web: string, file: 'link' | 'text'][] = [
	['HTTPS_PREFIX', 'HTTPS_PREFIX', 'link'],
	['AUTHORITY_END', 'AUTHORITY_END', 'link'],
	['IPV4_HOST', 'IPV4_HOST', 'link'],
	['DOTTED_HOST', 'DOTTED_HOST', 'link'],
	['INVISIBLE_CHARACTERS', 'HIDDEN_CHARACTER', 'text']
];

function patternFindings(sources: { link: string; text: string; web: string }): string[] {
	return SHARED_PATTERNS.flatMap(([server, web, file]) => {
		const theirs = patternOf(sources[file], server);
		const ours = patternOf(sources.web, web);
		if (theirs === null) return [`the server no longer writes ${server}`];
		if (ours === null) return [`${WEB_LINKS}: no ${web}`];
		return theirs === ours ? [] : [`${web}: /${ours}/ is not the server's /${theirs}/`];
	});
}

const SCREEN_82 = /^src\/modules\/doctor-dashboard\/ui\/(?:languages|spoken-languages|networks)\//u;
/** The only addresses the pages of screen 82 lead to: the pages of «Το προφίλ μου», resolved by their host. */
const OWN_ADDRESS = /^(?:links\.(?:profile|spoken|networks)|languagesHref)$/u;

/**
 * 🔴 D-W52-70 · U-65.6: on the pages of screen 82 a link the doctor typed is text — no `href` is made of anything but
 * the page's own addresses, and nothing opens in another tab.
 */
function addressFindings(files: SourceFile[]): string[] {
	return files
		.filter((file) => SCREEN_82.test(file.path))
		.flatMap((file) => [
			...[...file.text.matchAll(/\bhref=\{([^}]*)\}|\bhref="([^"]*)"/gu)]
				.map(([, made, written]) => (made ?? written).trim())
				.filter((address) => !OWN_ADDRESS.test(address))
				.map((address) => `${file.path}: href ${address}`),
			...(/\btarget=|window\.open|location\.(?:href|assign|replace)/u.test(file.text)
				? [`${file.path}: opens an address`]
				: [])
		]);
}

describe('the rules of the languages and of the links are the server’s own (wave 5.2 · screen 82)', () => {
	it('🔴 U-211 / D-W52-66 / D-W52-69: the limit of ten is the server’s `DOCTOR_SPEAK_LANGUAGE_LIMIT`', () => {
		expect(limitFindings(readBackend(LANGUAGE_POLICY))).toEqual([]);
	});

	it('🔴 U-211 / D-W52-64 / D-W52-69: the web reads a catalogue code exactly as the server’s pattern does, and Greek — the first of every list — is the server’s `SPEAK_LANGUAGE_GREEK_CODE`', () => {
		expect(codeFindings(readBackend(CATALOGUE))).toEqual([]);
	});

	it('🔴 U-211 / D-W52-67 / D-W52-70: the four fields, the longest link, the names of each network and the reasons of a refusal are the server’s own', () => {
		expect(linkFindings(readBackend(LINK_POLICY))).toEqual([]);
	});

	it('🔴 U-211 / D-W52-67 / D-W52-70: the patterns the page’s check is made of — `https://`, the end of the host, an IP address, a name with a dot, the hidden characters — are the server’s, character for character', () => {
		expect(
			patternFindings({
				link: readBackend(LINK_POLICY),
				text: readBackend(TEXT_POLICY),
				web: readWeb(WEB_LINKS)
			})
		).toEqual([]);
	});

	it('🔴 U-211 / D-W52-70 · U-65.6: on the pages of screen 82 a kept link is text — no `href` but the page’s own addresses, nothing opened in another tab', () => {
		const files = readSourceFiles();
		expect(files.filter((file) => SCREEN_82.test(file.path)).length).toBeGreaterThanOrEqual(6);
		expect(addressFindings(files)).toEqual([]);
	});

	it('(negative, planted) another limit, pattern, code of Greek, bound, network, field or reason — or a server that no longer says them — is reported', () => {
		expect(limitFindings('export const DOCTOR_SPEAK_LANGUAGE_LIMIT = 12;')).toEqual([
			'the server keeps 12 languages, the web 10'
		]);
		expect(limitFindings('const LIMIT = 10;')).toEqual([
			`${LANGUAGE_POLICY}: no DOCTOR_SPEAK_LANGUAGE_LIMIT`
		]);
		const catalogue = (pattern: string, greek: string) =>
			`export const SPEAK_LANGUAGE_CODE_PATTERN = '${pattern}';\nexport const SPEAK_LANGUAGE_GREEK_CODE = '${greek}';`;
		expect(codeFindings(catalogue('^SL\\\\d{3}$', 'SL001'))).toEqual([]);
		expect(codeFindings(catalogue('^SL\\\\d{2}$', 'SL001'))).not.toEqual([]);
		expect(codeFindings(catalogue('^SL\\\\d{3}$', 'SL002'))).toEqual([
			'Greek is SL002 on the server, SL001 on the web'
		]);
		expect(codeFindings('const PATTERN = 1;')).toEqual([
			`${CATALOGUE}: no SPEAK_LANGUAGE_CODE_PATTERN`
		]);
		const real = readBackend(LINK_POLICY);
		expect(
			linkFindings(
				real.replace('DOCTOR_SOCIAL_LINK_MAX_LENGTH = 2000', 'DOCTOR_SOCIAL_LINK_MAX_LENGTH = 500')
			)
		).toEqual(['the server keeps a link of 500, the web 2000']);
		expect(
			linkFindings(
				real.replace(
					"{ host: 'fb.com', subdomains: false }",
					"{ host: 'fb.com', subdomains: true }"
				)
			)
		).toHaveLength(1);
		expect(
			linkFindings(real.replace("host: 'linkedin.com'", "host: 'linkedin.example'"))
		).toHaveLength(1);
		expect(
			linkFindings(real.replace("'linkedin'] as const", "'linkedin', 'youtube'] as const"))
		).toEqual(["the server's fields are website, facebook, instagram, linkedin, youtube"]);
		expect(
			linkFindings(
				real.replace("NOT_HTTPS: 'NOT_HTTPS',", "NOT_HTTPS: 'NOT_HTTPS',\n  HAS_PORT: 'HAS_PORT',")
			)
		).toHaveLength(1);
		expect(linkFindings('const nothing = 1;')).toHaveLength(4);
	});

	it('(negative, planted) a pattern that differs by one character, or is gone, is reported', () => {
		const sources = {
			link: readBackend(LINK_POLICY),
			text: readBackend(TEXT_POLICY),
			web: readWeb(WEB_LINKS)
		};
		expect(
			patternFindings({ ...sources, web: sources.web.replace('{1,3}(', '{1,4}(') })
		).toHaveLength(1);
		expect(
			patternFindings({ ...sources, link: sources.link.replace('const DOTTED_HOST', 'const HOST') })
		).toEqual(['the server no longer writes DOTTED_HOST']);
		expect(
			patternFindings({ ...sources, web: sources.web.replace('const HIDDEN_CHARACTER', 'const X') })
		).toEqual([`${WEB_LINKS}: no HIDDEN_CHARACTER`]);
	});

	it('(negative, planted) a page of screen 82 that makes an address of a link, or opens one, is reported', () => {
		expect(
			addressFindings([
				{
					path: 'src/modules/doctor-dashboard/ui/languages/page/index.svelte',
					text: '<a href={links.spoken}></a><a href={line.link} target="_blank"></a>'
				},
				{
					path: 'src/modules/doctor-dashboard/ui/networks/page/index.svelte',
					text: '<a href="https://www.example.gr"></a>'
				},
				{
					path: 'src/modules/doctor-dashboard/ui/networks/hooks/use-networks.svelte.ts',
					text: 'window.open(link)'
				},
				{ path: 'src/modules/doctor/ui/detail/components/social-links.svelte', text: 'href={x}' }
			])
		).toEqual([
			'src/modules/doctor-dashboard/ui/languages/page/index.svelte: href line.link',
			'src/modules/doctor-dashboard/ui/languages/page/index.svelte: opens an address',
			'src/modules/doctor-dashboard/ui/networks/page/index.svelte: href https://www.example.gr',
			'src/modules/doctor-dashboard/ui/networks/hooks/use-networks.svelte.ts: opens an address'
		]);
	});
});
