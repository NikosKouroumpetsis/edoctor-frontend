export type CategoryId =
	| 'all'
	| 'internal-medicine'
	| 'pediatrics'
	| 'cardiology'
	| 'dermatology'
	| 'online';

export type SectionId = 'popular-athens' | 'online-this-week' | 'preventive-checkup';

export type CategorySeed = {
	id: CategoryId;
};

/**
 * Display card for the discovery home, adapted from the backend marketplace card view
 * (`card-adapter.ts`). It carries no category `tags`: category scoping is performed
 * server-side by the section query, never by client-side tag filtering.
 */
export type DoctorCard = {
	id: string;
	doctorSlug: string;
	name: string;
	specialty: string;
	city: string;
	availabilityLabel: string;
	visitFeeLabel: string;
	rating: number;
	reviewCount: number;
	badgeLabel?: string;
	imageUrl: string;
};

/** A home section resolved to display cards. */
export type HomeSection = {
	id: SectionId;
	doctors: DoctorCard[];
};
