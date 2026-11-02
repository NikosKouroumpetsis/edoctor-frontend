import { httpGet } from '$shared/lib/http';
import type { ConsentPublicRegistryResponseView } from '$shared/lib/api-client';
import { mapConsentRegistryToFacts } from './map';
import type { ConsentRegistryFacts } from './types';

const CONSENT_REGISTRY_PATH = '/consent/registry';

/**
 * The public consent registry (`GET /api/v1/consent/registry`, anonymous): every catalogued tool with its
 * category, platforms and both languages, plus the version a decision is stored with — the categories of
 * «Διαχείριση προτιμήσεων» (U-16.5), the application's source. Checked at the boundary (the application's
 * mapper): `null` when it carries no usable version, and the caller keeps the bundled registry.
 */
export async function getConsentRegistry(
	signal?: AbortSignal
): Promise<ConsentRegistryFacts | null> {
	const data = await httpGet<ConsentPublicRegistryResponseView>(CONSENT_REGISTRY_PATH, { signal });
	return mapConsentRegistryToFacts(data);
}
