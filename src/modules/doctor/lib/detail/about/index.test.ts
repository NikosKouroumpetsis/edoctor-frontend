import { describe, expect, it } from 'vitest';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '../detail.sample';
import { buildDoctorAboutContent } from './index';

const build = (extra: Partial<DoctorProfile> = {}, locale: 'el' | 'en' = 'el') =>
	buildDoctorAboutContent({
		doctor: sampleDoctorProfile(extra),
		locale,
		now: SAMPLE_NOW
	});

const entry = (id: string, extra = {}) => ({
	id,
	kind: 'STUDY' as const,
	title: `Τίτλος ${id}`,
	isCurrent: false,
	...extra
});

describe('buildDoctorAboutContent (U-73, screen 16)', () => {
	it('Π3: the card: who, and the figures of a rated doctor with a licence', () => {
		const content = build({ isPatientsChoice: true });
		expect(content.title).toBe('Γνωρίστε τον επαγγελματία υγείας');
		expect(content.name).toBe('Αθηνά Παπαδοπούλου');
		expect(content.badgeLabel).toBe('Επιλογή ασθενών');
		expect(content.stats.map(({ id, value, label }) => [id, value, label])).toEqual([
			['reviews', '184', 'Κριτικές'],
			['rating', '4,90', 'Βαθμολογία'],
			['experience', '13', 'Χρόνια εμπειρίας']
		]);
	});

	it('U-45.2 / Π10: no laurels without the backend’s word; no reviews, no figures of theirs', () => {
		expect(build()).not.toHaveProperty('badgeLabel');
		const bare = build({
			reviewCount: 0,
			reviewSummary: undefined,
			rating: 0,
			reviewSnippets: undefined,
			isPatientsChoice: true
		});
		expect(bare.stats.map((stat) => stat.id)).toEqual(['experience']);
		expect(bare).not.toHaveProperty('badgeLabel');
		expect(bare).not.toHaveProperty('reviews');
	});

	it('Π4: the rows in their order; U-42.2 «Άμεση επιβεβαίωση» of an `AUTO` office, with no rate', () => {
		const offices = [
			{
				officeId: 'off-1',
				bookingPolicy: {
					confirmationMode: 'AUTO' as const,
					cancellationCutoffHours: 4,
					minBookingNoticeHours: 1
				}
			}
		];
		const rows = build({
			offices,
			responseMetrics: { responseTimeId: 'within-hour', responseRatePercent: 98 }
		}).rows;
		expect(rows.map((row) => row.id)).toEqual([
			'specialty',
			'member-since',
			'languages',
			'license',
			'instant'
		]);
		expect(rows.at(-1)?.value).toBe('Άμεση επιβεβαίωση');
	});

	it('Π4 / U-43.1: a `MANUAL` office, the time and the rate, each only when the server sends it; unknown rules, neither', () => {
		const manual = [
			{
				officeId: 'off-1',
				bookingPolicy: {
					confirmationMode: 'MANUAL' as const,
					cancellationCutoffHours: 8,
					minBookingNoticeHours: 2
				}
			}
		];
		const rowsOf = (extra: Partial<DoctorProfile>) =>
			build(extra).rows.filter((row) => row.id.startsWith('response'));
		expect(
			rowsOf({
				offices: manual,
				responseMetrics: { responseTimeId: 'within-hour', responseRatePercent: 98.6 }
			}).map((row) => row.value)
		).toEqual(['Εντός μίας ώρας', '98%']);
		expect(rowsOf({ offices: manual, responseMetrics: { responseRatePercent: 0 } })).toHaveLength(
			1
		);
		expect(rowsOf({ offices: manual })).toEqual([]);
		expect(
			rowsOf({ responseMetrics: { responseTimeId: 'within-hour', responseRatePercent: 98 } })
		).toEqual([]);
	});

	it('Π5: the whole description, its paragraphs apart; none, no block', () => {
		expect(build().description).toBe(
			'Παθολόγος με έμφαση στην πρόληψη.\n\nΣυνεργάζεται με το νοσοκομείο Ευαγγελισμός.'
		);
		expect(build({ description: undefined })).not.toHaveProperty('description');
	});

	it('U-73.1 Ε2: years and a place, «σήμερα» for what goes on, one year alone; a group with none is not drawn', () => {
		const bio = build({
			credentials: [
				entry('now', { kind: 'WORK', startYear: 2016, isCurrent: true, organization: 'Ιατρείο' }),
				entry('span', { startYear: 2014, endYear: 2016 }),
				entry('same', { startYear: 2013, endYear: 2013 }),
				entry('end', { endYear: 2010 })
			]
		}).bio;
		const [work, studies] = [
			bio?.groups.find((group) => group.id === 'work-experience'),
			bio?.groups.find((group) => group.id === 'studies')
		];
		expect(work?.entries[0]).toEqual({
			id: 'now',
			title: 'Τίτλος now',
			organization: 'Ιατρείο',
			whenLabel: '2016 – σήμερα',
			whenAccessibleLabel: '2016 έως σήμερα'
		});
		expect(studies?.entries.map((row) => row.whenLabel)).toEqual(['2014 – 2016', '2013', '2010']);
		expect(studies?.entries[0]?.whenAccessibleLabel).toBe('2014 έως 2016');
		expect(bio?.groups.some((group) => group.id === 'conferences')).toBe(false);
		expect(studies?.moreLabel).toBe('Εμφάνιση όλων (3)');
	});

	it('U-73.1 (P-B §2): an entry without a year is its words alone', () => {
		const [row] = build({ credentials: [entry('plain')] }).bio?.groups[0]?.entries ?? [];
		expect(row).toEqual({ id: 'plain', title: 'Τίτλος plain' });
	});

	it('U-73.2: a read of the credentials that failed leaves the plain lists', () => {
		expect(build().bio?.groups[0]?.entries[0]).toEqual({
			id: 'studies-0',
			title: 'Ιατρική Σχολή ΕΚΠΑ'
		});
	});

	it('Π7, Π8: the names of the sections, the reviews’ count', () => {
		const content = build();
		expect(content.reviews?.title).toBe('Κριτικές για τον/την Dr. Αθηνά Παπαδοπούλου');
		expect(content.reviews?.showAllLabel).toBe('Εμφάνιση όλων των 184 κριτικών');
		expect(content.articlesTitle).toBe('Άρθρα του/της Dr. Αθηνά Παπαδοπούλου');
	});

	it('Π10: a doctor with nothing optional keeps only the card and what the server says', () => {
		const bare = build({
			description: undefined,
			bio: undefined,
			socialLinks: undefined,
			reviewSnippets: undefined
		});
		expect(bare).not.toHaveProperty('description');
		expect(bare).not.toHaveProperty('bio');
		expect(bare).not.toHaveProperty('reviews');
		expect(bare.socialLinks).toEqual([]);
	});
});
