import type { ArticlesFirstPageLoad, ArticlesListScope } from '$modules/articles/api';
import type { DoctorProfileLoad } from '$modules/doctor/api/profile';

/** The route's data (`routes/doctors/[slug]/articles/+page.server.ts`): the doctor, the kind, the first page. */
export type DoctorArticlesScreenProps = {
	data: {
		load: Extract<DoctorProfileLoad, { state: 'ready' }>;
		scope: ArticlesListScope;
		list: ArticlesFirstPageLoad;
	};
};
