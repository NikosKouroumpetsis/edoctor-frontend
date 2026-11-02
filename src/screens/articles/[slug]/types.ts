import type { ArticlePublicView } from '$modules/articles/api';

/** The article's route data (`routes/articles/[slug]/+page.server.ts`): its facts and «Περισσότερα άρθρα». */
export type ArticleScreenProps = {
	data: { article: ArticlePublicView; related: ArticlePublicView[] | null };
};
