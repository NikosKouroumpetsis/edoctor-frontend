import { describe, expect, it } from 'vitest';
import { sampleDoctorProfile } from '../detail.sample';
import { buildDoctorReviewsModalContent } from './index';

describe('lib/detail build-modal-content (the reviews window)', () => {
	it('U-45.2 (app = web): the window’s score carries «Επιλογή ασθενών» and its explanation only for a doctor the backend marks', () => {
		const doctor = sampleDoctorProfile({ isPatientsChoice: true });
		const header = buildDoctorReviewsModalContent({
			doctor,
			reviews: doctor.reviewSnippets,
			locale: 'el'
		})?.header;
		expect(header?.badgeTitle).toBe('Επιλογή ασθενών');
		expect(header?.description).toMatch(/Επιλογή ασθενών/u);
		expect(header?.scoreLabel).toBe('4,90');
	});

	it('U-45.2 (negative) — αντικαθίσταται από U-45.2 ο κανόνας «κάθε γιατρός με κριτικές»: a rated doctor the backend does not mark keeps the score, without the badge or its line', () => {
		const doctor = sampleDoctorProfile();
		const header = buildDoctorReviewsModalContent({
			doctor,
			reviews: doctor.reviewSnippets,
			locale: 'el'
		})?.header;
		expect(header?.scoreLabel).toBe('4,90');
		expect(header).not.toHaveProperty('badgeTitle');
		expect(header).not.toHaveProperty('description');
	});
});
