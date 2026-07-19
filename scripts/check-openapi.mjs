/**
 * Drift gate for the generated OpenAPI types (CI).
 *
 * Mirrors the backend's `openapi:check`: it regenerates the TypeScript types
 * from the committed vendored spec (`src/generated/api/openapi.json`) into a
 * temporary file and compares them with the committed output
 * (`src/generated/api/schema.ts`). If they differ, the committed types are
 * stale (spec was re-synced without regenerating, or the file was hand-edited)
 * and the check fails. Runs fully offline against the committed snapshot.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const specPath = resolve(repoRoot, 'src/generated/api/openapi.json');
const committedTypesPath = resolve(repoRoot, 'src/generated/api/schema.ts');
const binPath = resolve(repoRoot, 'node_modules/.bin/openapi-typescript');

const tempDir = mkdtempSync(join(tmpdir(), 'openapi-check-'));
const tempTypesPath = join(tempDir, 'schema.ts');

try {
	execFileSync(binPath, [specPath, '-o', tempTypesPath], { cwd: repoRoot, stdio: 'inherit' });

	const regenerated = readFileSync(tempTypesPath, 'utf8');
	const committed = readFileSync(committedTypesPath, 'utf8');

	if (regenerated !== committed) {
		console.error(
			'openapi:check - generated types are out of date. Run `bun run openapi:generate` and commit the result.'
		);
		process.exit(1);
	}

	console.log('openapi:check - generated types are in sync with the vendored spec');
} finally {
	rmSync(tempDir, { recursive: true, force: true });
}
