import { env } from '$env/dynamic/public';

const DEFAULT_SUPPORT_EMAIL = 'support@edoctor.gr';
const SUPPORT_EMAIL_PATTERN = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

/**
 * Support mailbox for public pages from `PUBLIC_SUPPORT_EMAIL`, read at runtime (no rebuild).
 * A missing or malformed value falls back to `support@edoctor.gr`, so a `mailto:` link can
 * never carry extra recipients or parameters.
 */
export function getSupportEmail(): string {
	const configured = env.PUBLIC_SUPPORT_EMAIL?.trim();

	return configured && SUPPORT_EMAIL_PATTERN.test(configured) ? configured : DEFAULT_SUPPORT_EMAIL;
}
