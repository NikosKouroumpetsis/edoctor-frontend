import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getTextDirection } from '$paraglide/runtime';
import { paraglideMiddleware } from '$paraglide/server';
import { preferencesStorageKey } from '$shared/config/env';
import { canonicalGreekPath } from '$shared/preferences/i18n';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
					.replace('%edoctor.preferences.key%', preferencesStorageKey)
		});
	});

export const handle: Handle = ({ event, resolve }) => {
	const { pathname, search } = event.url;

	// 🔴 D-W3-38: `/el/…` ⇒ the Greek canonical `/…`, with ONE leading `/` (never `//host`), the query kept.
	const canonicalPath = canonicalGreekPath(pathname);
	if (canonicalPath !== null) redirect(308, `${canonicalPath}${search}`);

	return handleParaglide({ event, resolve });
};
