import type { ContentPublicPageView } from '$shared/lib/api-client';
import type { RichTextDoc } from '$shared/lib/rich-text';
import type { LegalDocumentFacts, LegalDocumentUpcomingFacts } from './types';

/** The wire as it may really arrive: the OpenAPI's shape, every field possibly missing (and `body` an older name). */
type ContentPageWire = Partial<Record<keyof ContentPublicPageView, unknown>> & { body?: unknown };

const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim().length > 0 ? value : null;

const isDoc = (value: unknown): value is RichTextDoc =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The announced version and its day, or `null` when the page names none or names it partly. */
function mapUpcoming(upcoming: unknown): LegalDocumentUpcomingFacts | null {
	if (!upcoming || typeof upcoming !== 'object') return null;
	const { version, effectiveAt } = upcoming as Record<string, unknown>;
	if (typeof version !== 'string' || typeof effectiveAt !== 'string') return null;
	return { effectiveAt, version };
}

/**
 * Adapts a public CMS page to document facts (the application's `mapContentPageToFacts`, the same rules): the
 * rich text passes through untouched, both body spellings (`body`, `content`) are accepted, and a page without a title
 * is `null` (how a missing or unpublished page reaches the screen). The web adds the language and the `<head>` facts.
 */
export function mapContentPageToFacts(
	data: ContentPageWire | null | undefined,
	requestedSlug: string
): LegalDocumentFacts | null {
	if (!data || typeof data !== 'object') return null;
	const title = typeof data.title === 'string' ? data.title.trim() : '';
	if (title.length === 0) return null;
	const body = isDoc(data.body) ? data.body : isDoc(data.content) ? data.content : null;
	return {
		body,
		effectiveAt: typeof data.effectiveAt === 'string' ? data.effectiveAt : null,
		slug: text(data.slug) ?? requestedSlug,
		title,
		upcoming: mapUpcoming(data.upcoming),
		updatedAt: text((data as { updatedAt?: unknown }).updatedAt) ?? text(data.publishedAt),
		version: text(data.version),
		language: text(data.language),
		metaTitle: text(data.metaTitle),
		metaDescription: text(data.metaDescription),
		canonicalUrl: text(data.canonicalUrl)
	};
}
