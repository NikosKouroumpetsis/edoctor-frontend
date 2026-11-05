import type { DoctorPublicMarketplaceReviewsSummaryResponseView } from '$shared/lib/api-client';

type ServerReviewTopic = NonNullable<
	DoctorPublicMarketplaceReviewsSummaryResponseView['summary']
>['topics'][number]['topic'];

/** 🔴 U-91.2: the six topics of «Οι ασθενείς αναφέρουν», the server's own: none speaks of the wait. */
export const DOCTOR_REVIEW_TOPICS = [
	'COURTESY',
	'EXPLANATION',
	'ORGANIZATION',
	'CLEANLINESS',
	'PATIENCE',
	'ACCESS'
] as const satisfies readonly ServerReviewTopic[];

export type DoctorReviewTopic = (typeof DOCTOR_REVIEW_TOPICS)[number];
