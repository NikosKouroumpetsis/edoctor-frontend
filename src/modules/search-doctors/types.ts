export type CategoryId =
	| 'all'
	| 'internal-medicine'
	| 'pediatrics'
	| 'cardiology'
	| 'dermatology'
	| 'online';

export type SectionId = 'popular-athens' | 'online-this-week' | 'preventive-checkup';

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
	tags: CategoryId[];
};

export type DiscoverySection = {
	id: SectionId;
	doctorSlugs: string[];
};

export type DiscoveryData = {
	categories: { id: CategoryId }[];
	sections: DiscoverySection[];
	doctors: DoctorCard[];
};
