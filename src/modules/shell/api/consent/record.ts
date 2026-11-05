import { httpSessionPost } from '$shared/lib/http';
import type { ConsentSnapshot } from '$shared/storage/consent-storage';

const CONSENT_RECORD_PATH = '/consent/record';

/**
 * 🔴 R-4: records the signed-in account's decision (`POST /consent/record`, the application's `recordTrackingConsent`): the
 * server appends a row and dates it on its own clock (D-118), so the body names the answer and nothing else.
 */
export function recordConsentDecision({
	registryVersion,
	choices
}: ConsentSnapshot): Promise<unknown> {
	return httpSessionPost<unknown>(CONSENT_RECORD_PATH, {
		body: { registryVersion, platform: 'web', choices }
	});
}
