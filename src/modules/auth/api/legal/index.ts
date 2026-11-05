import type { ContentPublicPageView } from '$shared/lib/api-client';
import { httpGet } from '$shared/lib/http';

/**
 * The version a legal document is published at right now (the public CMS page, anonymous): the backend refuses an
 * acceptance whose version moved on, so it is read at submit time. `null` for a page that names none.
 */
export async function getLegalDocumentVersion(slug: string, lang: string): Promise<string | null> {
	const page = await httpGet<ContentPublicPageView>(
		`/content/public/pages/${encodeURIComponent(slug)}`,
		{ params: { lang } }
	);
	return page?.version ?? null;
}
