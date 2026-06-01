import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getTextDirection } from '$paraglide/runtime';
import { paraglideMiddleware } from '$paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = ({ event, resolve }) => {
	const { pathname, search } = event.url;

	if (pathname === '/el' || pathname.startsWith('/el/')) {
		const canonicalPath = pathname === '/el' ? '/' : pathname.slice('/el'.length);
		redirect(308, `${canonicalPath}${search}`);
	}

	return handleParaglide({ event, resolve });
};
