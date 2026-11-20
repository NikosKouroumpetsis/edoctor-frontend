import type { ArticleTextDoc } from '$shared/lib/article-text';
import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/** The calls of screen 85 as the contract writes them (D-W52-93 … 101, `w52-b9a` §11, `w52-b9b` §1–§3); inside `api/`. */
export type DoctorArticlesPageView = ApiResponseData<'listMyArticles', 200>;
export type DoctorArticleView = ApiResponseData<'getMyArticle', 200>;
export type DoctorArticleDeletedView = ApiResponseData<'deleteMyArticle', 200>;
export type DoctorArticleImageView = ApiResponseData<'uploadMyArticleImage', 200>;
export type DoctorArticleWriteBody = ApiRequestBody<'createMyArticleDraft'>;
export type DoctorArticleImageBody = ApiRequestBody<'uploadMyArticleImage'>;

/** D-W52-93: the one state of an article. */
export type DoctorArticleStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED';

/** U-221.1: «Άρθρο» / «Συμβουλή υγείας». */
export type DoctorArticleKind = 'ARTICLE' | 'HEALTH_ADVICE';

/** D-W52-94 (U-222.1): the doctor's change of a published article — waiting, or refused with the team's reason. */
export type DoctorArticleRevisionFacts = {
	status: 'IN_REVIEW' | 'REJECTED';
	submittedAt: string;
	rejectedAt: string | null;
	rejectionReason: string | null;
};

/**
 * FACTS of one row of «Τα άρθρα μου» (D-W52-96): no body; with a change of a published article its title, kind and
 * cover are the change's. Dates are the server's instants (`null` when not yet).
 */
export type DoctorArticleListItemFacts = {
	id: string;
	status: DoctorArticleStatus;
	kind: DoctorArticleKind;
	title: string;
	imageUrl: string | null;
	createdAt: string;
	updatedAt: string;
	submittedAt: string | null;
	publishedAt: string | null;
	rejectedAt: string | null;
	rejectionReason: string | null;
	hasPendingRevision: boolean;
	revision: DoctorArticleRevisionFacts | null;
};

/** One page of «Τα άρθρα μου», newest first: the next page's cursor (`null` at the end) and how many there are. */
export type DoctorArticlesPageFacts = {
	items: DoctorArticleListItemFacts[];
	nextCursor: string | null;
	total: number;
};

/** D-W52-100: an uploaded image of an article's text — its id, the address it is drawn from and its pixels. */
export type DoctorArticleImageFacts = {
	id: string;
	url: string;
	width: number | null;
	height: number | null;
};

/**
 * FACTS of one article as its page reads it (D-W52-96, D-W52-103): every field of the page; with a change of a
 * published article the fields are the change's. `content` is a document of the closed schema, or `null` (none yet, or
 * an answer that is not one). `cover` the address of its cover, `null` without one.
 */
export type DoctorArticleFacts = Omit<DoctorArticleListItemFacts, 'imageUrl'> & {
	publicSlug: string | null;
	shortDescription: string | null;
	content: ArticleTextDoc | null;
	contentImages: DoctorArticleImageFacts[];
	cover: string | null;
	readingMinutes: number | null;
	revisedAt: string | null;
};

/**
 * What the page sends (D-W52-95): the whole form, in Greek alone (U-207.3). `cover` a new file as a `data:` text,
 * `null` to remove the one there is, `undefined` to keep it.
 */
export type DoctorArticleDraft = {
	kind: DoctorArticleKind;
	title: string;
	shortDescription: string;
	content: ArticleTextDoc | null;
	cover?: string | null;
};

/** The four writes of the page (D-W52-95): a draft or a sending, of a new article or of one that exists. */
export type DoctorArticleWrite = 'save' | 'send';

/**
 * Why a call of screen 85 was refused: the session, the rate, an article no longer the doctor's to reach (D-107), its
 * state changed meanwhile, the 50 before the first publication, a field the sending needs, a text or a cover the
 * server would not take, too many uploads waiting, the body too large, anything else.
 */
export type DoctorArticlesFailure =
	| 'session'
	| 'rate-limited'
	| 'gone'
	| 'changed'
	| 'limit'
	| 'required'
	| 'content'
	| 'cover-small'
	| 'images-pending'
	| 'too-large'
	| 'invalid'
	| 'unknown';
