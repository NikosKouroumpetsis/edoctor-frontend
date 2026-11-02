import type { ContentPublicPageView } from '$shared/lib/api-client';
import { httpGet } from '$shared/lib/http';
import type { LegalDocumentEdition } from './types';

const CONTENT_PAGES_PATH = '/content/public/pages';

/** SvelteKit's `fetch` on the server (the answer is inlined into the page), the global one in the browser. */
export type ContentRequestContext = { fetch?: typeof fetch; signal?: AbortSignal };

/**
 * A public, guest-readable CMS page (`GET /content/public/pages/:slug`, the OpenAPI's `getPublicContentPage`, the
 * application's name): the slug path-encoded; `edition=upcoming` asks for the text an announced change brings (404
 * when none), without it the text in force now, which names `upcoming`.
 */
export function getPublicContentPage(
	{ edition, lang, slug }: { edition?: LegalDocumentEdition; lang?: string; slug: string },
	context: ContentRequestContext = {}
): Promise<ContentPublicPageView> {
	return httpGet<ContentPublicPageView>(`${CONTENT_PAGES_PATH}/${encodeURIComponent(slug)}`, {
		params: { edition, lang },
		fetch: context.fetch,
		signal: context.signal
	});
}
