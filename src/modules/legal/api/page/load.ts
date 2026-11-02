import { ApiError } from '$shared/lib/http';
import { getPublicContentPage } from './endpoints';
import { mapContentPageToFacts } from './map';
import type { LegalDocumentEdition, LegalDocumentLoad } from './types';

/**
 * One CMS page on the server (wave 1.5: the legal texts, screen 7, and the FAQ, screen 8): ONE read through
 * SvelteKit's `fetch`, awaited, so the page is whole without JavaScript and its `<head>` speaks for it. It never throws:
 * a 404 (or a page without a title) is `not-found`, any other failure `failed`.
 */
export async function loadContentPage(
	fetchImpl: typeof fetch,
	params: { slug: string; lang: string; edition?: LegalDocumentEdition }
): Promise<LegalDocumentLoad> {
	try {
		const data = await getPublicContentPage(
			{
				slug: params.slug,
				lang: params.lang === 'en' ? 'en' : 'el',
				...(params.edition ? { edition: params.edition } : {})
			},
			{ fetch: fetchImpl }
		);
		const document = mapContentPageToFacts(data, params.slug);
		return document ? { state: 'ready', document } : { state: 'not-found' };
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return { state: 'not-found' };
		return { state: 'failed' };
	}
}
