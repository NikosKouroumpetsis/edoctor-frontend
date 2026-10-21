/**
 * Refuses a commit that stages a secret (backend D-132): key files, private keys, Google service
 * account JSON, known key shapes and `.env*` files. `bun scripts/check-secrets.mjs` checks the staged
 * files (`.husky/pre-commit`), `--all` every tracked file. A finding names the file, never the value.
 */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** @typedef {{ path: string, content: Buffer | null }} Entry */
/** @typedef {{ path: string, kind: string, description: string, line: number | null }} Finding */
/** @typedef {{ kind: string, description: string, matches: (path: string) => boolean }} PathRule */
/** @typedef {{ kind: string, description: string, pattern: RegExp, requires?: RegExp }} ContentRule */
/** @typedef {{ path: RegExp, kind: string, reason: string }} AllowedFinding */
/** @typedef {(args: string[], input?: string) => Buffer} Git */

const KEY_FILE_EXTENSIONS = ['.p8', '.pem', '.key', '.p12', '.keystore', '.jks'];

/**
 * Path rules: a staged file whose NAME alone marks it as a secret. `env-file` is any `.env*` except
 * a `*.example` template (the `.gitignore` already keeps `.env` and `.env.*` out).
 * @type {PathRule[]}
 */
export const PATH_RULES = [
	{
		kind: 'key-file',
		description: 'private key / certificate store file',
		matches: (path) => KEY_FILE_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext))
	},
	{
		kind: 'env-file',
		description: 'environment file (only *.example templates are committed)',
		matches: (path) => /^\.env(\..+)?$/.test(baseName(path)) && !path.endsWith('.example')
	}
];

/**
 * Content rules: the known shapes of a secret inside a text file. The named group `secret` is the
 * variable part a placeholder check reads; each finding names the rule, never the value.
 * @type {ContentRule[]}
 */
export const CONTENT_RULES = [
	{
		kind: 'private-key',
		description: 'PEM private key block',
		pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g
	},
	{
		kind: 'google-service-account',
		description: 'Google service account JSON with a private key',
		pattern: /"type"\s*:\s*"service_account"/g,
		requires: /"private_key"\s*:/
	},
	{
		kind: 'aws-access-key-id',
		description: 'AWS access key id',
		pattern: /(?<![0-9A-Z])AKIA(?<secret>[0-9A-Z]{16})(?![0-9A-Z])/g
	},
	{
		kind: 'google-api-key',
		description: 'Google API key',
		pattern: /(?<![0-9A-Za-z_-])AIza(?<secret>[0-9A-Za-z_-]{35})(?![0-9A-Za-z_-])/g
	},
	{
		kind: 'twilio-account-sid',
		description: 'Twilio Account SID',
		pattern: /(?<![0-9A-Za-z])AC(?<secret>[0-9a-f]{32})(?![0-9A-Za-z])/g
	},
	{
		kind: 'twilio-auth-token',
		description: 'Twilio Auth Token assigned to TWILIO_AUTH_TOKEN',
		pattern: /TWILIO_AUTH_TOKEN["']?\s*[:=]\s*["']?(?<secret>[0-9a-f]{32})(?![0-9A-Za-z])/g
	},
	{
		kind: 'slack-token',
		description: 'Slack token or incoming webhook URL',
		pattern:
			/(?<![0-9A-Za-z])xox[abeoprs]-(?<secret>[0-9A-Za-z-]{10,})|https:\/\/hooks\.slack\.com\/services\/[0-9A-Za-z_/]+/g
	},
	{
		kind: 'github-token',
		description: 'GitHub token',
		pattern:
			/(?<![0-9A-Za-z_])(?:gh[pousr]_(?<secret>[0-9A-Za-z]{36})|github_pat_[0-9A-Za-z]{22}_[0-9A-Za-z]{59})(?![0-9A-Za-z_])/g
	}
];

/**
 * THE single exception list: a finding of `kind` on a path matching `path` is allowed for `reason`.
 * A false alarm is fixed here, with its reason, never with `git commit --no-verify`.
 * @type {AllowedFinding[]}
 */
export const ALLOWED_FINDINGS = [
	{
		path: /(^|\/)(google-services\.json|GoogleService-Info\.plist)$/,
		kind: 'google-api-key',
		reason: 'Firebase client config: its API key identifies the project (not a secret)'
	}
];

/**
 * The last segment of a repository path.
 * @param {string} path
 */
function baseName(path) {
	const slash = path.lastIndexOf('/');
	return slash === -1 ? path : path.slice(slash + 1);
}

/**
 * True when the buffer looks binary (a NUL byte in its first 8000 bytes, the rule git uses).
 * @param {Buffer} content
 */
function isBinary(content) {
	return content.subarray(0, 8000).includes(0);
}

/**
 * The 1-based line of a character offset.
 * @param {string} text
 * @param {number} index
 */
function lineOf(text, index) {
	let line = 1;
	for (let position = 0; position < index; position += 1) {
		if (text.charCodeAt(position) === 10) {
			line += 1;
		}
	}
	return line;
}

/**
 * A documentation or test placeholder, not a key: the variable part repeats at most two characters
 * (`AC000…0`, `AKIAXXXX…`) or is the ascending hex alphabet. Real keys are random.
 * @param {string | undefined} secret
 */
export function isPlaceholder(secret) {
	return (
		typeof secret === 'string' &&
		(new Set(secret).size <= 2 || /^(?:0123456789abcdef)+$/i.test(secret))
	);
}

/**
 * The first match of a content rule that is not a placeholder, or null.
 * @param {ContentRule} rule
 * @param {string} text
 */
function firstRealMatch(rule, text) {
	for (const match of text.matchAll(rule.pattern)) {
		if (!isPlaceholder(match.groups?.secret)) {
			return match;
		}
	}
	return null;
}

/**
 * Scans `{ path, content }` entries (content null = path-only) and answers the findings the
 * exception list does not allow: path, kind, description and line — never the matched text.
 * @param {Entry[]} entries
 * @param {AllowedFinding[]} [allowed]
 * @returns {Finding[]}
 */
export function scanEntries(entries, allowed = ALLOWED_FINDINGS) {
	/** @type {Finding[]} */
	const findings = [];
	for (const { path, content } of entries) {
		for (const rule of PATH_RULES) {
			if (rule.matches(path)) {
				findings.push({ path, kind: rule.kind, description: rule.description, line: null });
			}
		}
		if (!content || isBinary(content)) {
			continue;
		}

		const text = content.toString('utf8');
		for (const rule of CONTENT_RULES) {
			const match = firstRealMatch(rule, text);
			if (match && (!rule.requires || rule.requires.test(text))) {
				const line = lineOf(text, match.index ?? 0);
				findings.push({ path, kind: rule.kind, description: rule.description, line });
			}
		}
	}

	return findings.filter(
		(finding) =>
			!allowed.some((entry) => entry.kind === finding.kind && entry.path.test(finding.path))
	);
}

/**
 * Runs git with the given arguments and stdin; throws with git's own message when it fails.
 * @type {Git}
 */
function runGit(args, input) {
	const result = spawnSync('git', args, { input, maxBuffer: 1024 * 1024 * 1024 });
	if (result.error || result.status !== 0) {
		const reason = result.error ? result.error.message : result.stderr.toString('utf8').trim();
		throw new Error(`git ${args[0]} failed: ${reason}`);
	}
	return result.stdout;
}

/**
 * Splits a NUL-separated git listing.
 * @param {Buffer} buffer
 */
function splitNul(buffer) {
	return buffer
		.toString('utf8')
		.split('\0')
		.filter((path) => path.length > 0);
}

/**
 * The staged paths a commit would add, copy, modify or rename (`--diff-filter=ACMR`).
 * @param {Git} [git]
 */
export function listStagedPaths(git = runGit) {
	return splitNul(git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']));
}

/**
 * Every tracked path (`git ls-files`), for the one-off proof run over the whole repository.
 * @param {Git} [git]
 */
export function listTrackedPaths(git = runGit) {
	return splitNul(git(['ls-files', '-z']));
}

/**
 * Reads the INDEX version of every path (what the commit will contain) through ONE
 * `git cat-file --batch`; a path that is not a blob (a submodule) comes back with `content: null`.
 * @param {string[]} paths
 * @param {Git} [git]
 * @returns {Entry[]}
 */
export function readIndexEntries(paths, git = runGit) {
	if (paths.length === 0) {
		return [];
	}

	const output = git(['cat-file', '--batch'], paths.map((path) => `:${path}\n`).join(''));
	/** @type {Entry[]} */
	const entries = [];
	let offset = 0;
	for (const path of paths) {
		const headerEnd = output.indexOf(10, offset);
		const header = output.subarray(offset, headerEnd).toString('utf8');
		offset = headerEnd + 1;
		const [, type, size] = header.split(' ');
		if (header.endsWith(' missing') || size === undefined) {
			entries.push({ path, content: null });
			continue;
		}

		const length = Number(size);
		const content = type === 'blob' ? output.subarray(offset, offset + length) : null;
		entries.push({ path, content });
		offset += length + 1;
	}

	return entries;
}

/**
 * The report lines: the scanned count, then one line per finding (path, line, kind), never a value.
 * @param {Finding[]} findings
 * @param {number} scannedCount
 * @param {string} scope
 */
export function formatReport(findings, scannedCount, scope) {
	const lines = [`check-secrets: ${scannedCount} ${scope} file(s) scanned.`];
	if (findings.length === 0) {
		lines.push('check-secrets: no secret found.');
		return lines;
	}

	lines.push(`check-secrets: BLOCKED — ${findings.length} finding(s):`);
	for (const finding of findings) {
		const where = finding.line === null ? finding.path : `${finding.path}:${finding.line}`;
		lines.push(`  - ${where}: ${finding.kind} (${finding.description})`);
	}
	lines.push(
		'Remove the secret and unstage the file (`git restore --staged <file>`).',
		'A false alarm is fixed in ALLOWED_FINDINGS of scripts/check-secrets.mjs — never with --no-verify.'
	);
	return lines;
}

/**
 * Prints one report line on stdout.
 * @param {string} line
 */
function writeLine(line) {
	process.stdout.write(`${line}\n`);
}

/**
 * Runs the check: `--all` scans every tracked file, otherwise the staged ones. Answers the exit code.
 * @param {string[]} argv
 * @param {(line: string) => void} [write]
 * @param {Git} [git]
 */
export function main(argv, write = writeLine, git = runGit) {
	const scope = argv.includes('--all') ? 'tracked' : 'staged';
	/** @type {Entry[]} */
	let entries;
	try {
		const paths = scope === 'tracked' ? listTrackedPaths(git) : listStagedPaths(git);
		entries = readIndexEntries(paths, git);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		write(`check-secrets: cannot read the ${scope} files (${reason}); refusing the commit.`);
		return 2;
	}

	const findings = scanEntries(entries);
	formatReport(findings, entries.length, scope).forEach((line) => write(line));
	return findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	process.exitCode = main(process.argv.slice(2));
}
