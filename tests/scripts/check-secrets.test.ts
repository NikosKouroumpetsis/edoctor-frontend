import { describe, expect, it } from 'vitest';
import {
	formatReport,
	listStagedPaths,
	main,
	readIndexEntries,
	scanEntries
} from '../../scripts/check-secrets.mjs';

type GitCall = { args: string[]; input?: string };

const join = (...parts: string[]): string => parts.join('');
const text = (value: string): Buffer => Buffer.from(value, 'utf8');
const scan = (path: string, content: string | null = null) =>
	scanEntries([{ path, content: content === null ? null : text(content) }]);
const kindsOf = (findings: { kind: string }[]): string[] => findings.map((finding) => finding.kind);

const SAMPLES: Record<string, string> = {
	'private-key': join('-----BEGIN ', 'PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n'),
	'google-service-account': JSON.stringify({
		type: join('service', '_account'),
		private_key: 'k',
		client_email: 'a@b.iam'
	}),
	'aws-access-key-id': join('AK', 'IA', 'Q7LMN3XZ8PRT4KVW'),
	'google-api-key': join('AI', 'za', 'SyB4c9QxW2mP7vL1nB8cR5tW0yH4dF6gS2a'),
	'twilio-account-sid': join('A', 'C', '9f2c4e81b07d3a65e1c8f94b2d0a7e36'),
	'twilio-auth-token': join('TWILIO_AUTH', '_TOKEN=', '3e7a91c40f8b26d5a1e9c03f7b4d82e6'),
	'slack-token': join('xo', 'xb-', '2048193740-9921746380124-Qw7Er2Ty9Ui4Op'),
	'github-token': join('gh', 'p_', 'R7tY2uI9oP4aS1dF6gH3jK8lZ5xC0vB7nM2q')
};

/** A fake git that answers by sub-command and records every call; no repository is touched. */
function fakeGit(outputs: Record<string, Buffer>, calls: GitCall[]) {
	return (args: string[], input?: string): Buffer => {
		calls.push({ args, input });
		const output = outputs[args[0]];
		if (!output) {
			throw new Error(`unexpected git ${args[0]}`);
		}
		return output;
	};
}

describe('scripts/check-secrets (backend D-132: no secret reaches a commit)', () => {
	it.each(['AuthKey_ABC123.p8', 'certs/server.pem', 'ssl/site.key', 'cert.p12', 'release.jks'])(
		'blocks the key file %s by its name alone',
		(path) => {
			expect(kindsOf(scan(path))).toEqual(['key-file']);
		}
	);

	it.each(['.env', '.env.local', '.env.production'])('blocks the environment file %s', (path) => {
		expect(kindsOf(scan(path))).toEqual(['env-file']);
	});

	it('lets an *.example template through', () => {
		expect(scan('.env.example', 'PUBLIC_API_BASE_URL=http://localhost:8080/api/v1')).toEqual([]);
	});

	it.each(Object.entries(SAMPLES))(
		'blocks a %s inside a text file and names the line',
		(kind, sample) => {
			const findings = scan(
				'src/shared/config/leak.ts',
				`export const a = 1;\nconst v = '${sample}';\n`
			);

			expect(findings).toEqual([
				expect.objectContaining({ path: 'src/shared/config/leak.ts', kind, line: 2 })
			]);
		}
	);

	it('lets placeholders, a public certificate and the public env names through', () => {
		expect(scan('a.ts', join('A', 'C', '0'.repeat(32)))).toEqual([]);
		expect(scan('a.ts', join('AK', 'IA', 'X'.repeat(16)))).toEqual([]);
		expect(scan('a.md', join('-----BEGIN ', 'CERTIFICATE-----'))).toEqual([]);
		expect(scan('src/shared/config/api.ts', 'env.PUBLIC_API_BASE_URL')).toEqual([]);
	});

	it('lets a Firebase client config carry its API key, but not a real secret', () => {
		const config = JSON.stringify({ api_key: [{ current_key: SAMPLES['google-api-key'] }] });

		expect(scan('google-services.json', config)).toEqual([]);
		expect(kindsOf(scan('google-services.json', `${config}\n${SAMPLES['private-key']}`))).toEqual([
			'private-key'
		]);
	});

	it('reports the file, the line and the kind, never the value', () => {
		const findings = scan('src/leak.ts', `const k = '${SAMPLES['github-token']}';`);
		const report = formatReport(findings, 1, 'staged').join('\n');

		expect(report).toContain('src/leak.ts:1: github-token');
		expect(report).not.toContain(SAMPLES['github-token']);
		expect(report).not.toContain(SAMPLES['github-token'].slice(4));
	});

	it('lists ONLY the staged additions, copies, modifications and renames, read from the index', () => {
		const calls: GitCall[] = [];
		const blob = 'export const x = 1;\n';
		const git = fakeGit(
			{ diff: text('a.ts\0'), 'cat-file': text(`aaaa blob ${Buffer.byteLength(blob)}\n${blob}\n`) },
			calls
		);

		expect(listStagedPaths(git)).toEqual(['a.ts']);
		expect(readIndexEntries(['a.ts'], git)[0].content?.toString('utf8')).toBe(blob);
		expect(calls.map((call) => call.args)).toEqual([
			['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
			['cat-file', '--batch']
		]);
	});

	it('main blocks a staged secret with exit 1 and prints no value; git failing is exit 2', () => {
		const leak = `const token = '${SAMPLES['aws-access-key-id']}';\n`;
		const lines: string[] = [];
		const git = fakeGit(
			{
				diff: text('src/leak.ts\0'),
				'cat-file': text(`bbbb blob ${Buffer.byteLength(leak)}\n${leak}\n`)
			},
			[]
		);
		const broken = (): Buffer => {
			throw new Error('git diff failed: not a git repository');
		};

		expect(main([], (line) => lines.push(line), git)).toBe(1);
		expect(lines.join('\n')).toContain('src/leak.ts:1: aws-access-key-id');
		expect(lines.join('\n')).not.toContain(SAMPLES['aws-access-key-id']);
		expect(main([], () => undefined, broken)).toBe(2);
	});
});
