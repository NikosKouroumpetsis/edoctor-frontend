/**
 * Vendors the backend's OpenAPI 3.1 contract into this repository.
 *
 * Spec sharing model: "served + vendored snapshot". The backend (a separate
 * repo) serves `GET /openapi.json` and commits `backend/openapi.json`. This
 * frontend repo vendors a committed copy under `src/generated/api/openapi.json`
 * and generates types from that committed copy, so typecheck/CI work offline.
 *
 * Source precedence:
 *   1. The served URL derived from the API origin (or `OPENAPI_URL` override).
 *   2. Local-dev fallback: a build-time FILE read of the sibling
 *      `../backend/openapi.json`. This is a filesystem read, not a TypeScript
 *      import, so it does not cross the module backend-import boundary.
 *
 * This is a codegen input step. It never runs inside application code.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_BASE_URL = 'http://localhost:8081/api/v1';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const vendoredSpecPath = resolve(repoRoot, 'src/generated/api/openapi.json');
const siblingSpecPath = resolve(repoRoot, '../backend/openapi.json');

function resolveServedSpecUrl() {
	if (process.env.OPENAPI_URL) {
		return process.env.OPENAPI_URL;
	}

	const baseUrl = (process.env.PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).trim();

	try {
		return `${new URL(baseUrl).origin}/openapi.json`;
	} catch {
		return null;
	}
}

async function fetchServedSpec(url) {
	const response = await fetch(url, { headers: { Accept: 'application/json' } });

	if (!response.ok) {
		throw new Error(`served spec responded with status ${response.status}`);
	}

	return response.json();
}

function readSiblingSpec() {
	if (!existsSync(siblingSpecPath)) {
		throw new Error(`sibling spec not found at ${siblingSpecPath}`);
	}

	return JSON.parse(readFileSync(siblingSpecPath, 'utf8'));
}

async function loadSpec() {
	const servedUrl = resolveServedSpecUrl();

	if (servedUrl) {
		try {
			const spec = await fetchServedSpec(servedUrl);
			console.log(`openapi:sync - vendored spec from served URL ${servedUrl}`);
			return spec;
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.warn(
				`openapi:sync - served URL unavailable (${reason}); falling back to sibling file`
			);
		}
	}

	const spec = readSiblingSpec();
	console.log(`openapi:sync - vendored spec from sibling file ${siblingSpecPath}`);
	return spec;
}

const spec = await loadSpec();
const serialized = `${JSON.stringify(spec, null, 2)}\n`;

if (existsSync(vendoredSpecPath) && readFileSync(vendoredSpecPath, 'utf8') === serialized) {
	console.log('openapi:sync - vendored spec already up to date');
} else {
	writeFileSync(vendoredSpecPath, serialized);
	console.log(`openapi:sync - wrote ${vendoredSpecPath}`);
}
