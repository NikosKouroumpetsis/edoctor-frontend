import { cleanArticleTextRun, readArticleText } from '$shared/lib/article-text';
import { resolveMediaUrl } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import { readInstant } from '$shared/lib/instant';
import type {
	DoctorArticleDraft,
	DoctorArticleFacts,
	DoctorArticleImageFacts,
	DoctorArticleKind,
	DoctorArticleListItemFacts,
	DoctorArticleRevisionFacts,
	DoctorArticlesPageFacts,
	DoctorArticleStatus,
	DoctorArticleWriteBody
} from './types';

const STATUSES: readonly DoctorArticleStatus[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED'];
const KINDS: readonly DoctorArticleKind[] = ['ARTICLE', 'HEALTH_ADVICE'];
/** The server's longest reason of a refusal (the queue's `reason` ≤ 1000). */
const REASON_LIMIT = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const textOf = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value : null;
const urlOf = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? resolveMediaUrl(value.trim()) : null;
const reasonOf = (value: unknown): string | null => {
	const text = textOf(value)?.trim();
	return text ? Array.from(text).slice(0, REASON_LIMIT).join('') : null;
};
const sizeOf = (value: unknown): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

function revisionOf(value: unknown): DoctorArticleRevisionFacts | null | undefined {
	if (value === null || value === undefined) return null;
	if (!isRecord(value)) return undefined;
	const submittedAt = readInstant(value.submittedAt);
	if ((value.status !== 'IN_REVIEW' && value.status !== 'REJECTED') || !submittedAt)
		return undefined;
	const rejected = value.status === 'REJECTED';
	return {
		status: value.status,
		submittedAt,
		rejectedAt: rejected ? readInstant(value.rejectedAt) : null,
		rejectionReason: rejected ? reasonOf(value.rejectionReason) : null
	};
}

/** The fields a row and a page share, field by field; `null` for an answer that is no article of the doctor. */
function commonOf(value: unknown): Omit<DoctorArticleListItemFacts, 'imageUrl'> | null {
	if (!isRecord(value) || typeof value.id !== 'string' || !isUuid(value.id)) return null;
	const status = STATUSES.find((entry) => entry === value.status);
	const kind = KINDS.find((entry) => entry === value.type);
	const createdAt = readInstant(value.createdAt);
	const updatedAt = readInstant(value.updatedAt);
	const revision = revisionOf(value.revision);
	if (!status || !kind || typeof value.title !== 'string' || !createdAt || !updatedAt) return null;
	if (revision === undefined) return null;
	const rejected = status === 'REJECTED';
	return {
		id: value.id,
		status,
		kind,
		title: value.title,
		createdAt,
		updatedAt,
		submittedAt: readInstant(value.submittedAt),
		publishedAt: readInstant(value.publishedAt),
		rejectedAt: rejected ? readInstant(value.rejectedAt) : null,
		// 🔴 D-W52-93: the team's reason only for a refused article (a published one's lives in its change).
		rejectionReason: rejected ? reasonOf(value.rejectionReason) : null,
		hasPendingRevision: status === 'PUBLISHED' && value.hasPendingRevision === true,
		revision: status === 'PUBLISHED' ? revision : null
	};
}

/** 🔴 D-W52-96: one row of «Τα άρθρα μου», field by field (no body); `null` for an answer that is no row. */
export function mapDoctorArticleListItem(value: unknown): DoctorArticleListItemFacts | null {
	const common = commonOf(value);
	return common && isRecord(value) ? { ...common, imageUrl: urlOf(value.imageUrl) } : null;
}

/**
 * 🔴 D-W52-96: one page of «Τα άρθρα μου» — only what the server gave: a broken row stays out, each article once, the
 * cursor only as a text, the total a whole number. `null` for an answer that is no page.
 */
export function mapDoctorArticlesPage(value: unknown): DoctorArticlesPageFacts | null {
	if (!isRecord(value) || !Array.isArray(value.items)) return null;
	const seen = new Set<string>();
	const items: DoctorArticleListItemFacts[] = [];
	for (const entry of value.items) {
		const item = mapDoctorArticleListItem(entry);
		if (!item || seen.has(item.id)) continue;
		seen.add(item.id);
		items.push(item);
	}
	return {
		items,
		nextCursor: typeof value.nextCursor === 'string' && value.nextCursor ? value.nextCursor : null,
		total:
			typeof value.total === 'number' && Number.isInteger(value.total) && value.total >= 0
				? value.total
				: items.length
	};
}

/** D-W52-100: an uploaded image of the text — its id and the address it is drawn from; `null` for none. */
export function mapDoctorArticleImage(value: unknown): DoctorArticleImageFacts | null {
	if (!isRecord(value) || typeof value.id !== 'string' || !isUuid(value.id)) return null;
	const url = urlOf(value.lgSizeUrl) ?? urlOf(value.mediumSizeUrl) ?? urlOf(value.smSizeUrl);
	return url
		? { id: value.id.toLowerCase(), url, width: sizeOf(value.width), height: sizeOf(value.height) }
		: null;
}

/**
 * 🔴 D-W52-96 / D-W52-99: one article as its page reads it, field by field — its text ONLY as a document of the closed
 * schema (`readArticleText`; anything else is no text, never drawn), its uploads, its cover's address. `null` for an
 * answer that is no article of the doctor.
 */
export function mapDoctorArticle(value: unknown): DoctorArticleFacts | null {
	const common = commonOf(value);
	if (!common || !isRecord(value)) return null;
	const cover = isRecord(value.image)
		? (urlOf(value.image.lgSizeUrl) ??
			urlOf(value.image.mediumSizeUrl) ??
			urlOf(value.image.smSizeUrl))
		: null;
	const images = Array.isArray(value.contentImages)
		? value.contentImages
				.map(mapDoctorArticleImage)
				.filter((image): image is DoctorArticleImageFacts => image !== null)
		: [];
	return {
		...common,
		publicSlug:
			common.status === 'PUBLISHED' && typeof value.publicSlug === 'string' && value.publicSlug
				? value.publicSlug
				: null,
		shortDescription: textOf(value.shortDescription),
		content: readArticleText(value.content),
		contentImages: images,
		cover,
		readingMinutes: sizeOf(value.readingMinutes),
		revisedAt: readInstant(value.revisedAt)
	};
}

/** A line of plain words as the server takes it: control characters a space, bidi gone, NFC, the ends trimmed. */
const plainLine = (text: string) => cleanArticleTextRun(text).trim();

/**
 * 🔴 D-W52-95 (U-207.3, U-222.4): the body of a write — the whole form in Greek alone; NEVER a slug, an SEO field, an
 * author or a state (the server's). The cover only when it changes (`null` removes it, absent keeps it).
 */
export function toDoctorArticleBody(draft: DoctorArticleDraft): DoctorArticleWriteBody {
	const shortDescription = plainLine(draft.shortDescription);
	return {
		language: 'el',
		type: draft.kind,
		title: plainLine(draft.title),
		shortDescription: shortDescription || null,
		// The contract types the body's `content` as a bare object (its schema is `ArticleContentDoc`, D-W52-101).
		content: draft.content as unknown as DoctorArticleWriteBody['content'],
		...(draft.cover === undefined
			? {}
			: {
					image:
						draft.cover === null ? null : { file: draft.cover, fileName: fileNameOf(draft.cover) }
				})
	};
}

/** The file's name the API reads its type by: a fixed word and the type's own ending — never the person's file name. */
const ENDINGS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};
export function fileNameOf(dataUri: string): string | undefined {
	const type = /^data:([a-z0-9.+/-]+);base64,/iu.exec(dataUri)?.[1]?.toLowerCase();
	const ending = type ? ENDINGS[type] : undefined;
	return ending ? `image.${ending}` : undefined;
}
