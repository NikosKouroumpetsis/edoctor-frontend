import { error } from '@sveltejs/kit';
import { isLegalSlug } from '$modules/shell/lib/legal';
import type { PageLoad } from './$types';

/** Only the application's three legal slugs exist; any other is SvelteKit's 404. */
export const load: PageLoad = ({ params }) => {
	if (!isLegalSlug(params.slug)) error(404);
	return { slug: params.slug };
};
