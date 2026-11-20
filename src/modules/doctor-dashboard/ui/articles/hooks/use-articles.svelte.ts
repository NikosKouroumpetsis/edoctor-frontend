import { untrack } from 'svelte';
import { createInfiniteQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { doctorArticlesListQuery } from '$modules/doctor-dashboard/api/articles';
import { buildDoctorArticleRows } from '$modules/doctor-dashboard/lib/articles';
import type { DoctorArticlesView } from '../types';

/**
 * Wave 5.2 · screen 85 «Τα άρθρα μου» (U-221, D-W52-102): the doctor's articles page after page, newest first, as the
 * server keeps them — each row its state, kind, words of its state and cover. Only what the server gave is drawn; a `401`
 * ends the session once.
 */
export function useDoctorArticles(options: { locale: () => SupportedLocale }) {
	const session = getSessionOptional();
	const list = createInfiniteQuery(() => ({ ...doctorArticlesListQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const read = $derived({
		pages: list.data?.pages,
		isError: list.isError,
		error: list.error,
		hasMore: list.hasNextPage,
		fetchingMore: list.isFetchingNextPage
	});
	const rows = $derived(buildDoctorArticleRows(read.pages, options.locale()));
	const view = $derived.by((): DoctorArticlesView => {
		if (read.pages === undefined) return read.isError ? 'failed' : 'loading';
		return rows.length === 0 ? 'empty' : 'ready';
	});

	let ended: unknown = null;
	$effect(() => {
		const error = read.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	return {
		get view() {
			return view;
		},
		get rows() {
			return rows;
		},
		get hasMore() {
			return read.hasMore;
		},
		get loadingMore() {
			return read.fetchingMore;
		},
		loadMore() {
			if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
		},
		retry() {
			if (list.data && list.hasNextPage) void list.fetchNextPage();
			else void list.refetch();
		}
	};
}
