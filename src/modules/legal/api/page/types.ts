import type { RichTextDoc } from '$shared/lib/rich-text';

/**
 * A public CMS page as FACTS (the application's `modules/legal/api/page/types`, S-01.6): `title` and `body` arrive
 * already in the language asked for (or Greek, the backend's fallback: `language` says which); `body` stays the raw
 * rich-text document, which `lib/` and the shared `RichText` read. The web adds the `<head>` facts (U-28.4).
 */
export type LegalDocumentEdition = 'upcoming';

export type LegalDocumentUpcomingFacts = {
	effectiveAt: string;
	version: string;
};

export type LegalDocumentFacts = {
	body: RichTextDoc | null;
	effectiveAt: string | null;
	slug: string;
	title: string;
	upcoming: LegalDocumentUpcomingFacts | null;
	updatedAt: string | null;
	version: string | null;
	/** The language the text came in (`el` when the one asked for is missing), `null` when not said. */
	language: string | null;
	metaTitle: string | null;
	metaDescription: string | null;
	/** The canonical address the CMS proposes (the page keeps it only on its own https origin). */
	canonicalUrl: string | null;
};

export type LegalDocumentParams = {
	edition?: LegalDocumentEdition;
	lang?: string;
	slug: string;
};

/**
 * One CMS page on the server (wave 1.5, screens 7 and 8): never throws — `ready`, a page the CMS does not have (or no
 * announced edition: `not-found`, the route's 404) or a failed read (`failed`).
 */
export type LegalDocumentLoad =
	| { state: 'ready'; document: LegalDocumentFacts }
	| { state: 'not-found' }
	| { state: 'failed' };
