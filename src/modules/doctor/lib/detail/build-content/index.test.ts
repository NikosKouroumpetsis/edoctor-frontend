import { describe, expect, it } from 'vitest';
import { SAMPLE_NOW, sampleDoctorProfile } from '../detail.sample';
import { reviewAspectsLabel, reviewChipScoreLabel } from '../labels';
import { buildDoctorReviewRatingDistribution } from '../review-rating-distribution';
import {
	buildDoctorDetailContent,
	buildDoctorLocation,
	buildIdentity,
	buildProfessionalSection,
	buildReviewCard,
	buildReviews,
	buildServiceCost,
	buildSpecializations,
	buildSummary
} from './index';

const NBSP = ' ';

describe('lib/detail build-content', () => {
	it('U-35.1 (app = web): the summary «Επαγγελματίας υγείας: Χ» — the licence, the years on edoctor from «Μέλος από», the languages with their line, the intro = the first paragraph', () => {
		const summary = buildSummary(sampleDoctorProfile(), 'el', SAMPLE_NOW);
		expect(summary?.title).toBe('Επαγγελματίας υγείας: Αθηνά Παπαδοπούλου');
		expect(summary?.licenseLabel).toBe('Άδεια ιατρού: 6052');
		expect(summary?.platformExperienceLabel).toBe('11 χρόνια εμπειρίας μέσω του edoctor');
		expect(summary?.rows.map((row) => row.id)).toEqual(['languages']);
		expect(summary?.rows[0].title).toContain('Γλώσσες:');
		expect(summary?.intro).toBe('Παθολόγος με έμφαση στην πρόληψη.');
		expect(summary?.initial).toBe('Α');
	});

	it('U-35.4 / U-36.1 (app = web): no «Επικοινωνήστε» in the summary, and no response row without the backend’s metrics', () => {
		const summary = buildSummary(sampleDoctorProfile(), 'el', SAMPLE_NOW);
		const words = JSON.stringify(summary);
		expect(words).not.toMatch(/Επικοινωνήστε/u);
		expect(summary?.rows.some((row) => row.id.startsWith('response'))).toBe(false);
	});

	it('U-43.2 — MINOR-2 of r1 (app = web): the response rows follow the ACTIVE office’s confirmation — `AUTO` «Άμεση επιβεβαίωση» alone; `MANUAL` the metrics; unknown none', () => {
		const doctor = sampleDoctorProfile({
			responseMetrics: { responseTimeId: 'within-few-hours', responseRatePercent: 88 }
		});
		const idsOf = (mode?: 'AUTO' | 'MANUAL') =>
			buildSummary(doctor, 'el', SAMPLE_NOW, mode)
				?.rows.filter((row) => row.id.startsWith('response'))
				.map((row) => row.title);
		expect(idsOf('AUTO')).toEqual(['Χρόνος απόκρισης: Άμεση επιβεβαίωση']);
		expect(idsOf('MANUAL')).toEqual([
			'Χρόνος απόκρισης: Εντός λίγων ωρών',
			'Ρυθμός απόκρισης: 88%'
		]);
		expect(idsOf(undefined)).toEqual([]);
	});

	it('U-34.3 (app = web): a doctor with no summary fact has no summary', () => {
		const doctor = sampleDoctorProfile({
			licenseNumber: undefined,
			memberSince: undefined,
			languages: [],
			description: undefined
		});
		expect(buildSummary(doctor, 'el', SAMPLE_NOW)).toBeUndefined();
	});

	it('U-40.4 (app = web): «Γνωρίστε…» — «184 κριτικές · 4,90 ★ · 13 χρόνια εμπειρίας», the rows Μέλος από / Γλώσσες / Αρ. αδείας, the lead and the rest of the description', () => {
		const section = buildProfessionalSection(sampleDoctorProfile(), 'el', SAMPLE_NOW);
		expect(section?.stats.map((stat) => [stat.id, stat.value, stat.label])).toEqual([
			['reviews', '184', 'κριτικές'],
			['rating', '4,90', ''],
			['experience', '13', 'χρόνια εμπειρίας']
		]);
		expect(section?.infoRows.map((row) => row.id)).toEqual([
			'member-since',
			'languages',
			'license'
		]);
		expect(section?.about?.leadBody).toBe('Παθολόγος με έμφαση στην πρόληψη.');
		expect(section?.about?.body).toBe('Συνεργάζεται με το νοσοκομείο Ευαγγελισμός.');
		expect(section?.hasMore).toBe(true);
	});

	it('U-40.4 (app = web): a single paragraph is the lead alone — no body, no «Εμφάνιση περισσότερα»', () => {
		const section = buildProfessionalSection(
			sampleDoctorProfile({ description: { paragraphs: ['Μόνο ένα.'] } }),
			'el',
			SAMPLE_NOW
		);
		expect(section?.about).toEqual({ leadTitle: 'Σχετικά με τον γιατρό', leadBody: 'Μόνο ένα.' });
		expect(section?.hasMore).toBe(false);
	});

	it('U-36.2 (app = web): «Τομείς εξειδίκευσης» are the services marked `isSpecialized`, with their own line; the visits line waits for the backend (U-36.1)', () => {
		const specializations = buildSpecializations(sampleDoctorProfile(), 'el');
		expect(specializations?.items).toEqual([
			{ id: 'svc-1', title: 'Simple visit' },
			{ id: 'svc-2', title: 'Chronic follow-up', body: 'Παρακολούθηση χρόνιων νοσημάτων.' }
		]);
		expect(specializations?.completedVisits).toBeNull();
		expect(
			buildSpecializations(sampleDoctorProfile({ responseMetrics: { completedVisits: 523 } }), 'el')
				?.completedVisits
		).toBe('Ολοκληρωμένες επισκέψεις (6 μήνες): 523');
	});

	it('U-36.2 (app = web): no service marked — no section', () => {
		const doctor = sampleDoctorProfile();
		const plain = sampleDoctorProfile({
			services: doctor.services?.map((service) => ({ ...service, isSpecialized: false }))
		});
		expect(buildSpecializations(plain, 'el')).toBeUndefined();
	});

	it('U-34.4 / U-38.1 (app = web): the cost of a guest is «Συνδεθείτε για κόστος», a member’s the amount; no services — no section', () => {
		const guest = buildServiceCost(sampleDoctorProfile(), 'el');
		expect(guest?.services.map((service) => service.price)).toEqual([
			{ kind: 'login', label: 'Συνδεθείτε για κόστος' },
			{ kind: 'login', label: 'Συνδεθείτε για κόστος' },
			{ kind: 'login', label: 'Συνδεθείτε για κόστος' }
		]);
		const member = buildServiceCost(sampleDoctorProfile({ pricingVisible: true }), 'el');
		expect(member?.services[0].price).toEqual({ kind: 'amount', label: `40${NBSP}€` });
		expect(buildServiceCost(sampleDoctorProfile({ services: [] }), 'el')).toBeUndefined();
	});

	it('U-34.3 (app = web): each section only with data — a full doctor has no «έρχεται σύντομα»', () => {
		const content = buildDoctorDetailContent({
			doctor: sampleDoctorProfile(),
			locale: 'el',
			now: SAMPLE_NOW
		});
		expect(content.soonTitle).toBeNull();
		expect(content.summary && content.professional && content.reviews && content.bio).toBeTruthy();
	});

	it('U-34.3 (app = web): a doctor with nothing beyond a name and a specialty keeps the title «Το αναλυτικό προφίλ έρχεται σύντομα» alone, no discovery line', () => {
		const content = buildDoctorDetailContent({
			doctor: sampleDoctorProfile({
				images: [],
				rating: 0,
				reviewCount: 0,
				reviewSummary: undefined,
				reviewChips: [],
				reviewSnippets: [],
				services: [],
				office: undefined,
				offices: [],
				description: undefined,
				bio: undefined,
				languages: [],
				socialLinks: [],
				licenseNumber: undefined,
				licenseObtainedDate: undefined,
				memberSince: undefined
			}),
			locale: 'el',
			now: SAMPLE_NOW
		});
		expect(content.soonTitle).toBe('Το αναλυτικό προφίλ έρχεται σύντομα');
		expect(
			[
				content.summary,
				content.professional,
				content.specializations,
				content.serviceCost,
				content.reviews,
				content.bio
			].every((part) => part === undefined)
		).toBe(true);
	});

	it('U-39.1 (app = web): the location of an office — two address lines, its point, its payments, floor, parking, access, its phone for `tel:`', () => {
		const location = buildDoctorLocation(sampleDoctorProfile().office, 'el');
		expect(location?.streetLine).toBe('Νίκης 12, 10557');
		expect(location?.cityLine).toBe('Αθήνα, Αττική');
		expect(location?.coordinates).toEqual({ latitude: 37.975, longitude: 23.735 });
		expect(location?.paymentMethods?.options.map((option) => option.id)).toEqual(['card', 'cash']);
		expect(location?.facilityRows.map((row) => row.id)).toEqual(['parking', 'disability-access']);
		expect(location?.contactRows.map((row) => row.id)).toEqual(['phone', 'floor']);
		expect(location?.dialNumber).toBe('2101234567');
	});

	it('U-45.2 (app = web): «Επιλογή ασθενών» in the identity and over the reviews only for a doctor the backend marks (`isPatientsChoice`)', () => {
		const chosen = sampleDoctorProfile({ isPatientsChoice: true });
		expect(buildIdentity(chosen, 'el').rating?.badgeLabel).toBe('Επιλογή ασθενών');
		expect(buildReviews(chosen, 'el')?.badgeTitle).toBe('Επιλογή ασθενών');
	});

	it('U-45.2 (negative) — αντικαθίσταται από U-45.2 ο κανόνας «κάθε γιατρός με κριτικές»: a rated doctor the backend does not mark keeps its score and count, without the laurels', () => {
		for (const doctor of [
			sampleDoctorProfile({ isPatientsChoice: false }),
			sampleDoctorProfile({ isPatientsChoice: undefined })
		]) {
			const rating = buildIdentity(doctor, 'el').rating;
			expect(rating?.scoreLabel).toBe('4,90');
			expect(rating).not.toHaveProperty('badgeLabel');
			expect(buildReviews(doctor, 'el')).not.toHaveProperty('badgeTitle');
		}
	});

	it('U-49 (app = web): a review on the 5 stars — its aspects in half stars with the page’s decimal mark («4,5», «5») — the chips as the application («4,9»)', () => {
		const card = buildReviewCard(
			{
				id: 'rev-9',
				body: 'Πολύ καλή.',
				patientName: 'Μαρία Κ.',
				patientInitial: 'Μ',
				publishedAt: '2026-09-12T10:00:00Z',
				rating: 4.5,
				aspects: [
					{ id: 'trust', score: 4.5 },
					{ id: 'expertise', score: 5 }
				]
			},
			'el'
		);
		expect(card.stars).toBe(5);
		expect(card.aspectsLabel).toBe('Εμπιστοσύνη 4,5 · Εξειδίκευση 5');
		expect(card.aspectsLabel).not.toMatch(/\d\.\d/u);
		const chips = buildReviews(sampleDoctorProfile(), 'el')?.chips.map((chip) => chip.score);
		expect(chips).toEqual(['4,9', '4,7']);
	});

	it('U-49 — r4 (app = web): the card draws whole stars rounded as the window’s spread counts them — 4,28 ⇒ 4 (never 5), its name says what it draws', () => {
		const card = (rating: number) =>
			buildReviewCard(
				{
					id: 'rev-r4',
					body: '',
					patientName: 'Μαρία Κ.',
					patientInitial: 'Μ',
					publishedAt: '2026-09-12T10:00:00Z',
					rating
				},
				'el'
			);
		expect(card(4.28).stars).toBe(4);
		expect(card(4.28).rating).toBe(4.28);
		expect(card(4.28).ratingLabel).toBe('4 από 5 αστέρια');
		expect(card(4.5).stars).toBe(5);
		expect(card(0.5).stars).toBe(1);
		expect(
			buildDoctorReviewRatingDistribution([card(4.28)]).find((bucket) => bucket.count)?.star
		).toBe(card(4.28).stars);
	});

	it('U-49 — r4 (app = web): an aspect’s average to the backend’s two decimals and at least one — «4,75», «4,5», «5,0»; a review’s own aspects without the «,0»', () => {
		expect(['4,75', '4,5', '5,0']).toEqual(
			[4.75, 4.5, 5].map((score) => reviewChipScoreLabel(score, 'el'))
		);
		expect(reviewChipScoreLabel(4.75, 'en')).toBe('4.75');
		expect(
			reviewAspectsLabel(
				[
					{ id: 'trust', score: 4.75 },
					{ id: 'expertise', score: 5 }
				],
				'el'
			)
		).toBe('Εμπιστοσύνη 4,75 · Εξειδίκευση 5');
	});
});
