import type { ArticlesFirstPageLoad, ArticlesListScope } from '$modules/articles/api';

/** The list's route data (`routes/articles/+page.server.ts`): the address's view and the server's first page. */
export type ArticlesScreenProps = {
	data: { scope: ArticlesListScope; list: ArticlesFirstPageLoad };
};
