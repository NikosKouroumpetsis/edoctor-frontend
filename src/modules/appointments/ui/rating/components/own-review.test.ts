import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import type { OwnReviewFacts } from '$modules/appointments/api/rating';
import { buildOwnReviewCard } from '$modules/appointments/lib/rating';
import OwnReview from './own-review.svelte';

/*
 * U-138.5 · «Η κριτική σας» on screen 51 (record §10.2, `appt.js:214-226`): its state, the stars and the grade, the day,
 * the words, the five aspects, its sentence, the way to the profile once published, the policy once refused, the doctor's
 * approved reply. Made-up people.
 */

const review: OwnReviewFacts = {
	ratingId: 'rat-1',
	appointmentId: 'apt-h3',
	doctorId: 'doc-maria',
	patientName: 'Ελένη',
	patientInitial: 'Π',
	overallStars: 4.9,
	comment: 'Πολύ προσεκτική εξέταση.\nΔεν περίμενα καθόλου.',
	moderation: 'APPROVED',
	aspects: { 'in-depth': 5, trust: 5, expertise: 5, punctuality: 4.5, friendliness: 5 },
	reply: { body: 'Σας ευχαριστώ.', at: '2026-07-08T09:00:00.000Z' },
	createdAt: '2026-07-05T09:00:00.000Z'
};

const draw = (
	facts: OwnReviewFacts,
	profileHref: string | null = '/doctors/dr-maria/details/reviews?focus=rat-1',
	authorName = 'Ελένη Π.'
) =>
	render(OwnReview, {
		props: {
			card: buildOwnReviewCard({
				review: facts,
				authorName,
				doctorName: 'Dr. Μαρία Τριανταφύλλου',
				locale: 'el'
			}),
			profileHref,
			policyHref: '/legal/review-policy'
		}
	});

describe('«Η κριτική σας» (U-138.5, U-138.6)', () => {
	it('published: green «Δημοσιεύτηκε», ★ with «4,9» and its day, the words, the five aspects, the name it shows under, the profile and the doctor’s reply', () => {
		draw(review);
		const card = screen.getByTestId('appointment-review');
		expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Η κριτική σας');
		expect(screen.getByTestId('appointment-review-status')).toHaveTextContent('Δημοσιεύτηκε');
		expect(screen.getByTestId('appointment-review-status')).toHaveAttribute('data-tone', 'success');
		expect(card.querySelector('[data-slot="rating"]')).toHaveAttribute('aria-label', '4,9 στα 5');
		expect(card).toHaveTextContent('4,9');
		expect(screen.getByTestId('appointment-review-date')).toHaveTextContent('5 Ιουλίου 2026');
		expect(screen.getByTestId('appointment-review-comment')).toHaveTextContent(
			'Πολύ προσεκτική εξέταση. Δεν περίμενα καθόλου.'
		);
		const aspects = screen.getByTestId('appointment-review-aspects');
		expect([...aspects.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
			'Σε βάθος',
			'Εμπιστοσύνη',
			'Εξειδίκευση',
			'Συνέπεια',
			'Φιλικότητα'
		]);
		expect(aspects.querySelectorAll('dd')[3]).toHaveTextContent('4,5');
		expect(aspects).toHaveClass('tablet:grid-cols-2');
		expect(card).toHaveTextContent('Φαίνεται στο προφίλ του γιατρού με το όνομα Ελένη Π.');
		expect(screen.getByTestId('appointment-review-profile')).toHaveAttribute(
			'href',
			'/doctors/dr-maria/details/reviews?focus=rat-1'
		);
		expect(screen.queryByTestId('appointment-review-policy')).toBeNull();
		const reply = screen.getByTestId('appointment-review-reply');
		expect(reply).toHaveTextContent('Απάντηση από Dr. Μαρία Τριανταφύλλου');
		expect(reply).toHaveTextContent('8 Ιουλίου 2026');
		expect(reply).toHaveTextContent('Σας ευχαριστώ.');
	});

	it('in moderation: warm «Σε έλεγχο», D-W4-12 (no promise of an email), no way to the profile, no reply', () => {
		draw({ ...review, moderation: 'PENDING', reply: null });
		expect(screen.getByTestId('appointment-review-status')).toHaveAttribute('data-tone', 'warning');
		expect(screen.getByTestId('appointment-review')).toHaveTextContent(
			'Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.'
		);
		expect(screen.getByTestId('appointment-review')).not.toHaveTextContent(/email/u);
		expect(screen.queryByTestId('appointment-review-profile')).toBeNull();
		expect(screen.queryByTestId('appointment-review-reply')).toBeNull();
	});

	it('refused: neutral «Δεν δημοσιεύτηκε» with «Πολιτική κριτικών»; 🔴 U-138.6 «κριτική», never «αξιολόγηση»', () => {
		draw({ ...review, moderation: 'REJECTED', reply: null });
		expect(screen.getByTestId('appointment-review-status')).toHaveAttribute('data-tone', 'muted');
		expect(screen.getByTestId('appointment-review-policy')).toHaveAttribute(
			'href',
			'/legal/review-policy'
		);
		expect(screen.queryByTestId('appointment-review-profile')).toBeNull();
		expect(screen.getByTestId('appointment-review')).not.toHaveTextContent(/αξιολόγ/iu);
	});

	it('🔴 U-65.6 (negative): what the patient or the doctor wrote stays words — markup is drawn as text; a doctor nobody may see leaves no way to the profile', () => {
		draw(
			{
				...review,
				comment: '<img src=x onerror=alert(1)>',
				reply: { body: '<b>Ευχαριστώ</b>', at: null }
			},
			null
		);
		expect(screen.getByTestId('appointment-review-comment')).toHaveTextContent(
			'<img src=x onerror=alert(1)>'
		);
		expect(screen.getByTestId('appointment-review').querySelector('img, b')).toBeNull();
		expect(screen.queryByTestId('appointment-review-profile')).toBeNull();
	});

	it('review w4-w6 R1 NIT-4 (negative): published with no name from the server — no sentence about a name, nothing left hanging', () => {
		draw(review, undefined, '');
		const card = screen.getByTestId('appointment-review');
		expect(card).not.toHaveTextContent('με το όνομα');
		expect(screen.queryByTestId('appointment-review-say')).toBeNull();
		expect(screen.getByTestId('appointment-review-profile')).toBeInTheDocument();
	});
});
