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
