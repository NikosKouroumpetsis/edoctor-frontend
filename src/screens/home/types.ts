import type { HomeArticlesResult } from '$modules/articles/lib/article-card';
import type { HomePageData } from '$modules/search-doctors/types';

export type HomeScreenProps = {
	data: HomePageData & { articles: Promise<HomeArticlesResult> };
};
