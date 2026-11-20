import {
	httpSessionDelete,
	httpSessionGet,
	httpSessionPost,
	httpSessionPut
} from '$shared/lib/http';
import {
	fileNameOf,
	mapDoctorArticle,
	mapDoctorArticleImage,
	mapDoctorArticlesPage,
	toDoctorArticleBody
} from './map';
import type {
	DoctorArticleDeletedView,
	DoctorArticleDraft,
	DoctorArticleFacts,
	DoctorArticleImageBody,
	DoctorArticleImageFacts,
	DoctorArticleImageView,
	DoctorArticlesPageFacts,
	DoctorArticlesPageView,
	DoctorArticleView,
	DoctorArticleWrite
} from './types';

const ARTICLES_PATH = '/article/me/articles';
const articlePath = (articleId: string) => `${ARTICLES_PATH}/${encodeURIComponent(articleId)}`;

/**
 * 🔴 D-W52-96: one page of «Τα άρθρα μου», newest first (`no-store`, with the cookies) — nothing in the request names a
 * doctor: the session does. `null` for an answer that is no page.
 */
export async function listDoctorArticles(
	input: { limit: number; cursor?: string },
	signal?: AbortSignal
): Promise<DoctorArticlesPageFacts | null> {
	return mapDoctorArticlesPage(
		await httpSessionGet<DoctorArticlesPageView>(ARTICLES_PATH, {
			params: { limit: input.limit, cursor: input.cursor },
			signal
		})
	);
}

/** D-W52-96: one article of the doctor with every field of its page; another's answers the one 403 (D-107). */
export async function getDoctorArticle(
	articleId: string,
	signal?: AbortSignal
): Promise<DoctorArticleFacts | null> {
	return mapDoctorArticle(
		await httpSessionGet<DoctorArticleView>(articlePath(articleId), { signal })
	);
}

/**
 * 🔴 D-W52-95: the four writes — «Αποθήκευση πρόχειρου» of a new article (`POST`) or of one (`PUT`, a draft or a refused
 * one), «Αποστολή για έλεγχο» of a new one (`POST …/submission`) or of one (`POST …/<id>/submission`, a published one's
 * change). ONE call each; the article as the server now keeps it, `null` for an answer that is no article.
 */
export async function writeDoctorArticle(
	articleId: string | null,
	write: DoctorArticleWrite,
	draft: DoctorArticleDraft
): Promise<DoctorArticleFacts | null> {
	const options = { body: toDoctorArticleBody(draft) };
	if (articleId === null)
		return mapDoctorArticle(
			await httpSessionPost<DoctorArticleView>(
				write === 'save' ? ARTICLES_PATH : `${ARTICLES_PATH}/submission`,
				options
			)
		);
	return mapDoctorArticle(
		write === 'save'
			? await httpSessionPut<DoctorArticleView>(articlePath(articleId), options)
			: await httpSessionPost<DoctorArticleView>(`${articlePath(articleId)}/submission`, options)
	);
}

/** 🔴 D-W52-95: «Διαγραφή άρθρου» — a published one leaves the public page too. Whether the server deleted that article. */
export async function deleteDoctorArticle(articleId: string): Promise<boolean> {
	const answer = await httpSessionDelete<DoctorArticleDeletedView>(articlePath(articleId), {
		body: {}
	});
	return typeof answer === 'object' && answer !== null && answer.id === articleId;
}

/**
 * 🔴 D-W52-100: one image of the text — the file as a base64 `data:` text inside the JSON, nothing else (the server checks
 * its bytes and writes it again without EXIF / GPS). The upload's id and address; `null` for an answer that is none.
 */
export async function uploadDoctorArticleImage(
	file: string
): Promise<DoctorArticleImageFacts | null> {
	const body: DoctorArticleImageBody = { image: { file, fileName: fileNameOf(file) } };
	return mapDoctorArticleImage(
		await httpSessionPost<DoctorArticleImageView>(`${ARTICLES_PATH}/images`, { body })
	);
}
