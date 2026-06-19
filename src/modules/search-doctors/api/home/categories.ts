import type { CategorySeed } from '../../types';

/**
 * Static client-side category rail. Rail taps re-query the home sections scoped to the
 * selected category server-side (see `sections-query.svelte.ts`) rather than filtering a
 * single cached payload — the backend cards carry no category tags.
 */
export const searchDoctorsCategories: CategorySeed[] = [
	{ id: 'all' },
	{ id: 'internal-medicine' },
	{ id: 'pediatrics' },
	{ id: 'cardiology' },
	{ id: 'dermatology' },
	{ id: 'online' }
];
