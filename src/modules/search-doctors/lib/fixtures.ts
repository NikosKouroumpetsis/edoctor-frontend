import type { CategoryId, DiscoveryData, DoctorCard, SectionId } from '../types';

/*
 * Static discovery seed mirrored from the application's mock data
 * (edoctor-application/src/modules/search-doctors/__mocks__/main-screen.json).
 * Replace with a TanStack Query backed source once a backend exists.
 */
export const discoveryData: DiscoveryData = {
	categories: [
		{ id: 'all' },
		{ id: 'internal-medicine' },
		{ id: 'pediatrics' },
		{ id: 'cardiology' },
		{ id: 'dermatology' },
		{ id: 'online' }
	],
	sections: [
		{
			id: 'popular-athens',
			doctorSlugs: ['dr-athena-papadopoulou', 'dr-eva-kalogeropoulou', 'dr-giannis-leventis']
		},
		{
			id: 'online-this-week',
			doctorSlugs: ['dr-nikos-ioannou', 'dr-maria-stefanou', 'dr-eleni-markou']
		},
		{
			id: 'preventive-checkup',
			doctorSlugs: ['dr-athena-papadopoulou', 'dr-eleni-markou', 'dr-nikos-ioannou']
		}
	],
	doctors: [
		{
			id: 'doctor-athena',
			doctorSlug: 'dr-athena-papadopoulou',
			name: 'Dr. Athena Papadopoulou',
			specialty: 'Internal medicine',
			city: 'Athens · Midtown Care',
			availabilityLabel: 'Today · 18:30',
			visitFeeLabel: 'EUR 40 visit',
			rating: 4.9,
			reviewCount: 184,
			badgeLabel: 'Patient favorite',
			imageUrl:
				'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'internal-medicine', 'online']
		},
		{
			id: 'doctor-eva',
			doctorSlug: 'dr-eva-kalogeropoulou',
			name: 'Dr. Eva Kalogeropoulou',
			specialty: 'Dermatology',
			city: 'Athens · Skin Lab Kolonaki',
			availabilityLabel: 'Tomorrow · 11:00',
			visitFeeLabel: 'EUR 55 visit',
			rating: 4.8,
			reviewCount: 129,
			badgeLabel: 'Patient favorite',
			imageUrl:
				'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'dermatology']
		},
		{
			id: 'doctor-giannis',
			doctorSlug: 'dr-giannis-leventis',
			name: 'Dr. Giannis Leventis',
			specialty: 'Cardiology',
			city: 'Athens · Heart Point',
			availabilityLabel: 'Thursday · 09:45',
			visitFeeLabel: 'EUR 60 visit',
			rating: 4.9,
			reviewCount: 208,
			imageUrl:
				'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'cardiology']
		},
		{
			id: 'doctor-nikos',
			doctorSlug: 'dr-nikos-ioannou',
			name: 'Dr. Nikos Ioannou',
			specialty: 'Internal medicine',
			city: 'Online · WholeCare',
			availabilityLabel: 'Wednesday · 20:15',
			visitFeeLabel: 'EUR 35 video visit',
			rating: 4.7,
			reviewCount: 96,
			imageUrl:
				'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'internal-medicine', 'online']
		},
		{
			id: 'doctor-maria',
			doctorSlug: 'dr-maria-stefanou',
			name: 'Dr. Maria Stefanou',
			specialty: 'Pediatrics',
			city: 'Online · Family First',
			availabilityLabel: 'Friday · 17:30',
			visitFeeLabel: 'EUR 45 visit',
			rating: 4.9,
			reviewCount: 142,
			badgeLabel: 'Patient favorite',
			imageUrl:
				'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'pediatrics', 'online']
		},
		{
			id: 'doctor-eleni',
			doctorSlug: 'dr-eleni-markou',
			name: 'Dr. Eleni Markou',
			specialty: 'Preventive care',
			city: 'Athens · Well Studio',
			availabilityLabel: 'Monday · 12:00',
			visitFeeLabel: 'EUR 50 visit',
			rating: 4.8,
			reviewCount: 88,
			imageUrl:
				'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=900&q=80',
			tags: ['all', 'online', 'internal-medicine']
		}
	]
};

const doctorsBySlug = new Map<string, DoctorCard>(
	discoveryData.doctors.map((doctor) => [doctor.doctorSlug, doctor])
);

/** Resolve a section's doctor slugs to cards, filtered by the active category. */
export function resolveSectionDoctors(
	sectionId: SectionId,
	activeCategory: CategoryId
): DoctorCard[] {
	const section = discoveryData.sections.find((entry) => entry.id === sectionId);
	if (!section) return [];

	return section.doctorSlugs
		.map((slug) => doctorsBySlug.get(slug))
		.filter((doctor): doctor is DoctorCard => Boolean(doctor))
		.filter((doctor) => activeCategory === 'all' || doctor.tags.includes(activeCategory));
}
