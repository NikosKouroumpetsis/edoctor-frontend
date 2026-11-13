import { queryOptions } from '@tanstack/svelte-query';
import { personalQueryMeta } from '$shared/query';
import { previewDeletion } from './endpoints';

export const deletionPreviewKey = ['account', 'deletion-preview'] as const;

/**
 * What the deletion would do, read in the browser for a member (U-80.1 Ε6); 🔴 U-65.6: personal — gone at a sign-out —
 * and never kept past the page (`gcTime` 0): the counts and the hidden address are asked again each time it opens.
 */
export function deletionPreviewQuery() {
	return queryOptions({
		queryKey: deletionPreviewKey,
		queryFn: ({ signal }) => previewDeletion(signal),
		staleTime: 0,
		gcTime: 0,
		retry: false,
		meta: personalQueryMeta
	});
}
