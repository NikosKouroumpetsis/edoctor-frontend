import { env } from '$env/dynamic/public';

const DEFAULT_SITE_ORIGIN = 'https://edoctor.gr';
const BARE_ORIGIN = /^https?:\/\/[^/\s?#@]+$/iu;

/**
 * The site's public origin (`https://…`, no path) from `PUBLIC_SITE_ORIGIN`, read at runtime: the base of every
 * absolute address a page prints (canonical, `og:url`, `hreflang`, a shared link) — never the request's `Host`, a
 * header anyone sets. A missing or malformed value (not a bare http(s) origin) falls back to `https://edoctor.gr`.
 */
export function getSiteOrigin(): string {
	const configured = env.PUBLIC_SITE_ORIGIN?.trim().replace(/\/+$/u, '');

	return configured && BARE_ORIGIN.test(configured) ? configured : DEFAULT_SITE_ORIGIN;
}

/**
 * The site's absolute address of a path (`/doctors/…`, or a relative or absolute one): ALWAYS on the site's origin,
 * its dot segments resolved — never `..`, never another host.
 */
export function siteUrl(path: string): string {
	const origin = getSiteOrigin();
	const { pathname, search } = new URL(path, `${origin}/`);
	return `${origin}${pathname}${search}`;
}

/**
 * 🔴 Common v2 (U-28.4, U-57.4): a canonical address the backend proposes (`canonicalUrl` of an article or a CMS page), kept ONLY
 * when it is `https:` on the site's own origin; anything else (another host, `http:`, a path, a malformed value) is
 * `null` and the page writes its own.
 */
export function ownSiteUrl(candidate: string | null | undefined): string | null {
	if (typeof candidate !== 'string' || !candidate.trim()) return null;
	let url: URL;
	try {
		url = new URL(candidate.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.username || url.password) return null;
	return url.origin === getSiteOrigin() ? url.href : null;
}
