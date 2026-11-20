import { infiniteQueryOptions, queryOptions } from '@tanstack/svelte-query';
import { ApiError } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';
import { isFinalDoctorRefusal } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DOCTOR_ARTICLES_PAGE_LIMIT } from '$modules/doctor-dashboard/config';
import { getDoctorArticle, listDoctorArticles } from './endpoints';
import type { DoctorArticleFacts, DoctorArticlesPageFacts } from './types';

/** A refusal (`401` the session, `403` / `404` another doctor's or none) is an answer: asking again changes nothing. */
const retry = (failures: number, error: unknown) => !isFinalDoctorRefusal(error) && failures < 1;

/**
 * 🔴 D-W52-96 · D-W52-102: «Τα άρθρα μου» page after page by the server's cursor, newest first — in the browser only,
 * personal (gone at a sign-out), under the articles' root (a write reads it again). An answer that is no page fails.
 */
export function doctorArticlesListQuery() {
	return infiniteQueryOptions({
		queryKey: doctorDashboardQueryKeys.articleList(),
		queryFn: async ({ pageParam, signal }): Promise<DoctorArticlesPageFacts> => {
			const page = await listDoctorArticles(
				{ limit: DOCTOR_ARTICLES_PAGE_LIMIT, cursor: pageParam },
				signal
			);
			if (!page) throw new ApiError('Not a page of articles', 0, '/article/me/articles');
			return page;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (page) => page.nextCursor ?? undefined,
		staleTime: 30_000,
		retry,
		meta: personalQueryMeta
	});
}

/**
 * D-W52-103: ONE article by its id, as the server keeps it now (`staleTime: 0`): a page never starts from a text that
 * changed elsewhere. A `403` (D-107) is an article no longer the doctor's to reach.
 */
export function doctorArticleQuery(articleId: string) {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.article(articleId),
		queryFn: async ({ signal }): Promise<DoctorArticleFacts> => {
			const article = await getDoctorArticle(articleId, signal);
			if (!article) throw new ApiError('Not an article', 0, '/article/me/articles/:id');
			return article;
		},
		staleTime: 0,
		refetchOnWindowFocus: false,
		retry,
		meta: personalQueryMeta
	});
}
