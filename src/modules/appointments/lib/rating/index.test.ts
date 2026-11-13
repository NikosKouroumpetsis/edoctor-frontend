import { describe, expect, it } from 'vitest';
import { createForm } from '$shared/lib/form';
import type { OwnReviewFacts, RatingInvitationFacts } from '$modules/appointments/api/rating';
import {
	buildOwnReviewCard,
	clampRatingComment,
	emptyRatingForm,
	emptyRatingValues,
	gradeLabel,
	gradeLine,
	gradeOf,
	halfStarLabel,
	missingAspects,
	ratingAspectRows,
	ratingCommentCounter,
	ratingCommentError,
	ratingFormMessages,
	ratingFormRules,
	ratingThenLines,
	ratingUntilLine,
	ratingValuesOf,
	readRatingComment,
	readRatingInvitationView,
	readRatingOutcome,
	starValueText,
	toRatingSubmitRequest,
	type RatingValues
} from '.';

/** In the server's order: in-depth, trust, expertise, punctuality, friendliness. */
const values = (
	inDepth: number,
	trust: number,
	expertise: number,
	punctuality: number,
	friendliness: number
): RatingValues => ({
	'in-depth': inDepth,
	trust,
	expertise,
	punctuality,
	friendliness
});

describe('screen 54 · the five aspects and the grade (U-138, record §10.1)', () => {
	it('the aspects in the server’s order, by the profile’s names, each with its line', () => {
		expect(ratingAspectRows('el').map((row) => row.name)).toEqual([
			'Σε βάθος',
			'Εμπιστοσύνη',
			'Εξειδίκευση',
			'Συνέπεια',
			'Φιλικότητα'
		]);
		expect(ratingAspectRows('el')[0]?.hint).toBe('Αφιέρωσε χρόνο και σας εξέτασε προσεκτικά.');
	});

	it('🔴 the grade by the server’s formula (weights 1,2 · 1,0 · 1,2 · 0,8 · 0,8): literal vectors, never the function’s own', () => {
		expect(gradeOf(values(10, 10, 10, 10, 10))).toBe(5);
		expect(gradeOf(values(9, 10, 9, 8, 10))).toBe(4.6);
		expect(gradeOf(values(8, 9, 10, 7, 9))).toBe(4.34);
		expect(gradeOf(values(1, 1, 1, 1, 1))).toBe(0.5);
		expect(gradeOf(values(10, 10, 10, 9, 10))).toBe(4.92);
		expect(gradeOf(values(3, 7, 2, 9, 6))).toBe(2.5);
		expect(gradeOf(values(7, 8, 6, 9, 5))).toBe(3.48);
	});

	it('(negative) a missing or out-of-range aspect leaves no grade; «Λείπουν Ν» counts them', () => {
		expect(gradeOf(values(10, 10, 10, 10, 0))).toBeNull();
		expect(gradeOf(values(10, 10, 11, 10, 10))).toBeNull();
		expect(gradeOf(values(10, 10, 4.5, 10, 10))).toBeNull();
		expect(missingAspects(emptyRatingValues())).toBe(5);
		expect(gradeLine(emptyRatingValues(), 'el')).toBe('Βγαίνει από τις πέντε πτυχές.');
		expect(gradeLine(values(10, 10, 10, 10, 0), 'el')).toBe('Λείπει 1 πτυχή.');
		expect(gradeLine(values(10, 0, 10, 0, 0), 'el')).toBe('Λείπουν 3 πτυχές.');
		expect(gradeLine(values(10, 10, 10, 10, 10), 'el')).toBe(
			'Το «Σε βάθος» και η «Εξειδίκευση» μετρούν περισσότερο.'
		);
	});

	it('D-W4-27 / P-W4 Σ-11: «4,5 στα 5» for the reader, «Χωρίς βαθμό» for none; the number beside the stars', () => {
		expect(starValueText(9, 'el')).toBe('4,5 στα 5');
		expect(starValueText(10, 'el')).toBe('5 στα 5');
		expect(starValueText(0, 'el')).toBe('Χωρίς βαθμό');
		expect(starValueText(9, 'en')).toBe('4.5 out of 5');
		expect(halfStarLabel(7, 'el')).toBe('3,5');
		expect(halfStarLabel(0, 'el')).toBe('');
		expect(gradeLabel(4.6, 'el')).toBe('4,6');
		expect(gradeLabel(5, 'el')).toBe('5,0');
	});
});

describe('screen 54 · the text and the body (U-65.6)', () => {
	it('the text trimmed; `<` / `>` refused with the form’s words (D-W4-13); 🔴 D-W4-36.8: over 2000 UTF-16 units refused', () => {
		expect(readRatingComment('  Πολύ καλά.  ')).toEqual({ text: 'Πολύ καλά.', problem: null });
		expect(readRatingComment('   ')).toEqual({ text: null, problem: null });
		const brackets = readRatingComment('Καλός <b>γιατρός</b>');
		expect(brackets.problem).toBe('brackets');
		expect(ratingCommentError(brackets, 'el')).toBe(
			'Το κείμενο δεν μπορεί να περιέχει τα σύμβολα < και >.'
		);
		expect(readRatingComment('α'.repeat(2000)).problem).toBeNull();
		expect(readRatingComment('α'.repeat(2001)).problem).toBe('too-long');
		// Review w4-w3 R1 MINOR-3 (negative): 1000 emoji are 2000 units, as the server's Joi counts them; 1001 are refused
		// here — and 1980 letters with 20 emoji (2000 code points, 2020 units) too, never sent for the server's 422.
		expect(readRatingComment('😀'.repeat(1000)).problem).toBeNull();
		expect(readRatingComment('😀'.repeat(1001)).problem).toBe('too-long');
		expect(readRatingComment(`${'α'.repeat(1980)}${'😀'.repeat(20)}`).problem).toBe('too-long');
		expect(ratingCommentError(readRatingComment('ok'), 'el')).toBeNull();
	});

	it('🔴 U-65.6 · D-W4-36.8: the field keeps 2000 UTF-16 units — a paste past it is cut, never half an emoji; «N/2000»', () => {
		expect(clampRatingComment('α'.repeat(2001))).toHaveLength(2000);
		expect(clampRatingComment(`${'α'.repeat(1999)}😀`)).toBe('α'.repeat(1999));
		expect(clampRatingComment('Καλά.')).toBe('Καλά.');
		expect(ratingCommentCounter('😀😀', 'el')).toBe('4/2000');
		expect(ratingCommentCounter('α'.repeat(2500), 'el')).toBe('2000/2000');
	});

	it('the body names the five as the server does, whole 1–10; the text only when there is some', () => {
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 10), '  Πολύ καλά. ')).toEqual({
			aspect: {
				inDepthRating: 10,
				trustRating: 9,
				expertiseRating: 10,
				punctualRating: 8,
				friendlyRating: 10
			},
			comment: 'Πολύ καλά.'
		});
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 10), '')).not.toHaveProperty('comment');
	});

	it('(negative) nothing travels the server would refuse: a missing aspect, a half value, the brackets, 2001', () => {
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 0), '')).toBeNull();
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 9.5), '')).toBeNull();
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 10), 'a > b')).toBeNull();
		expect(toRatingSubmitRequest(values(10, 9, 10, 8, 10), 'α'.repeat(2001))).toBeNull();
	});
});

describe('screen 54 · the invitation and the refusals (U-138.3, D-W4-23)', () => {
	const invitation: RatingInvitationFacts = {
		invitationId: 'inv-1',
		appointmentId: 'apt-h1',
		status: 'OPEN',
		expiresAt: '2026-12-21T08:00:00.000Z',
		canSubmit: true,
		submitBlocker: null,
		ratingId: null,
		patientName: null,
		patientInitial: null
	};

	it('the form; 🔴 D-W4-23: an answered one goes to its appointment, no refusal shown; a closed one says why', () => {
		expect(readRatingInvitationView(invitation, 'el')).toEqual({ kind: 'form' });
		expect(
			readRatingInvitationView(
				{
					...invitation,
					status: 'SUBMITTED',
					ratingId: 'rat-1',
					canSubmit: false,
					submitBlocker: 'RATING_INVITATION_NOT_OPEN'
				},
				'el'
			)
		).toEqual({ kind: 'reviewed', appointmentId: 'apt-h1' });
		expect(
			readRatingInvitationView(
				{
					...invitation,
					status: 'EXPIRED',
					canSubmit: false,
					submitBlocker: 'RATING_INVITATION_EXPIRED'
				},
				'el'
			)
		).toEqual({
			kind: 'blocked',
			message: 'Ο χρόνος για να γράψετε κριτική για αυτή την επίσκεψη έληξε.'
		});
		expect(
			readRatingInvitationView({ ...invitation, status: 'REVOKED', canSubmit: false }, 'el')
		).toEqual({
			kind: 'blocked',
			message: 'Για την επίσκεψη έχει ήδη γραφτεί κριτική ή η πρόσκλησή της έκλεισε.'
		});
	});

	it('record §10.2: the four lines — the check, the server’s name (D-W4-26), «δεν αλλάζει», «έως {expiresAt}»; without the name or the instant their line goes', () => {
		expect(
			ratingThenLines({
				authorName: 'Ελένη Π.',
				expiresAt: invitation.expiresAt,
				locale: 'el'
			})
		).toEqual([
			'Η ομάδα του eDoctor ελέγχει κάθε κριτική πριν δημοσιευτεί.',
			'Φαίνεται μόνο το μικρό σας όνομα και το αρχικό του επωνύμου: Ελένη Π.',
			'Μετά την υποβολή η κριτική δεν αλλάζει.',
			'Μπορείτε να γράψετε κριτική για την επίσκεψη έως 21 Δεκεμβρίου 2026.'
		]);
		const bare = ratingThenLines({ authorName: null, expiresAt: null, locale: 'el' });
		expect(bare).toEqual([
			'Η ομάδα του eDoctor ελέγχει κάθε κριτική πριν δημοσιευτεί.',
			'Μετά την υποβολή η κριτική δεν αλλάζει.'
		]);
		expect(bare.join(' ')).not.toMatch(/Ελένη|έως/u);
	});

	it('the last day «έως 21 Δεκεμβρίου 2026»; a refusal in the screen’s terms', () => {
		expect(ratingUntilLine(invitation.expiresAt, 'el')).toBe(
			'Μπορείτε να γράψετε κριτική για την επίσκεψη έως 21 Δεκεμβρίου 2026.'
		);
		expect(ratingUntilLine(null, 'el')).toBeNull();
		expect(readRatingOutcome({ kind: 'not-accessible', status: 403, blocker: null }, 'el')).toEqual(
			{
				kind: 'not-accessible'
			}
		);
		expect(
			readRatingOutcome(
				{ kind: 'blocked', status: 403, blocker: 'RATING_DOCTOR_LICENSE_INACTIVE' },
				'el'
			)
		).toEqual({
			kind: 'blocked',
			message: 'Ο γιατρός δεν μπορεί να δεχτεί κριτικές αυτή τη στιγμή.'
		});
		expect(
			readRatingOutcome({ kind: 'already-rated', status: 409, blocker: null }, 'el').kind
		).toBe('blocked');
		expect(readRatingOutcome({ kind: 'unknown', status: 0, blocker: null }, 'el')).toEqual({
			kind: 'failed',
			message: 'Η κριτική δεν υποβλήθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		});
		expect(readRatingOutcome({ kind: 'session', status: 401, blocker: null }, 'el')).toEqual({
			kind: 'session'
		});
	});
});

describe('«Η κριτική σας» on screen 51 (U-138.5, U-138.6)', () => {
	const review: OwnReviewFacts = {
		ratingId: 'rat-1',
		appointmentId: 'apt-h3',
		doctorId: 'doc-maria',
		patientName: 'Ελένη',
		patientInitial: 'Π',
		overallStars: 4.9,
		comment: 'Πολύ προσεκτική εξέταση.',
		moderation: 'APPROVED',
		aspects: { 'in-depth': 5, trust: 5, expertise: 5, punctuality: 4.5, friendliness: 5 },
		reply: { body: 'Σας ευχαριστώ.', at: '2026-07-08T09:00:00.000Z' },
		createdAt: '2026-07-05T09:00:00.000Z'
	};

	it('published: green, the grade, the day, the aspects, the name as the profile shows it, the link and the reply', () => {
		expect(
			buildOwnReviewCard({
				review,
				authorName: 'Ελένη Π.',
				doctorName: 'Dr. Μαρία Τριανταφύλλου',
				locale: 'el'
			})
		).toEqual({
			title: 'Η κριτική σας',
			status: { label: 'Δημοσιεύτηκε', tone: 'success' },
			stars: 4.9,
			grade: '4,9',
			starsLabel: '4,9 στα 5',
			date: '5 Ιουλίου 2026',
			comment: 'Πολύ προσεκτική εξέταση.',
			aspects: [
				{ id: 'in-depth', name: 'Σε βάθος', value: '5' },
				{ id: 'trust', name: 'Εμπιστοσύνη', value: '5' },
				{ id: 'expertise', name: 'Εξειδίκευση', value: '5' },
				{ id: 'punctuality', name: 'Συνέπεια', value: '4,5' },
				{ id: 'friendliness', name: 'Φιλικότητα', value: '5' }
			],
			// The sentence's full stop is the initial's too: «… Ελένη Π.», never «Π..».
			say: 'Φαίνεται στο προφίλ του γιατρού με το όνομα Ελένη Π.',
			seeOnProfile: 'Δείτε τη στο προφίλ του γιατρού',
			policy: null,
			reply: {
				from: 'Απάντηση από Dr. Μαρία Τριανταφύλλου',
				date: '8 Ιουλίου 2026',
				body: 'Σας ευχαριστώ.'
			}
		});
	});

	it('in moderation warm (D-W4-12: no promise of an email); refused neutral with the policy; 🔴 U-173 «κριτική», never the old word', () => {
		const pending = buildOwnReviewCard({
			review: { ...review, moderation: 'PENDING', reply: null },
			authorName: 'Ελένη Π.',
			doctorName: null,
			locale: 'el'
		});
		expect(pending).toMatchObject({
			status: { label: 'Σε έλεγχο', tone: 'warning' },
			say: 'Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.',
			seeOnProfile: null,
			reply: null
		});
		expect(pending.say).not.toMatch(/email/u);
		const refused = buildOwnReviewCard({
			review: { ...review, moderation: 'REJECTED', reply: null },
			authorName: 'Ελένη Π.',
			doctorName: null,
			locale: 'el'
		});
		expect(refused).toMatchObject({
			status: { label: 'Δεν δημοσιεύτηκε', tone: 'muted' },
			policy: 'Πολιτική κριτικών',
			seeOnProfile: null
		});
		expect(`${pending.title} ${refused.title}`).not.toMatch(/ξιολ[οό]γ/iu);
	});

	it('review w4-w6 R1 NIT-4 (negative): a published review the server gave no name for says no sentence — never «…με το όνομα » left hanging; the way to the profile stays', () => {
		for (const authorName of ['', '   ']) {
			const card = buildOwnReviewCard({
				review: { ...review, moderation: 'APPROVED' },
				authorName,
				doctorName: null,
				locale: 'el'
			});
			expect(card.say, JSON.stringify(authorName)).toBeNull();
			expect(card.seeOnProfile).toBe('Δείτε τη στο προφίλ του γιατρού');
		}
		// In moderation or refused the sentence names nobody: it stays.
		expect(
			buildOwnReviewCard({
				review: { ...review, moderation: 'PENDING' },
				authorName: '',
				doctorName: null,
				locale: 'el'
			}).say
		).toBe('Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.');
	});

	it('(negative) no stars, no aspects, no date: none of them printed', () => {
		const card = buildOwnReviewCard({
			review: { ...review, overallStars: null, aspects: null, createdAt: null, comment: null },
			authorName: '',
			doctorName: null,
			locale: 'el'
		});
		expect(card).toMatchObject({
			stars: null,
			grade: null,
			starsLabel: '',
			aspects: [],
			date: '',
			comment: null
		});
	});
});

describe('screen 54 · the form’s rules for `createForm` (review w4-arch-frontend L-2, U-65.6)', () => {
	const form = () =>
		createForm({
			initialValues: emptyRatingForm(),
			validators: ratingFormRules(),
			messages: ratingFormMessages('el')
		});

	it('the empty form: five aspects without a value and no words; every aspect is required, the words are not', () => {
		const empty = form();
		expect(ratingValuesOf(empty.values)).toEqual(emptyRatingValues());
		expect(empty.values.comment).toBe('');
		expect(empty.validate()).toBe(false);
		expect(Object.keys(empty.errors).filter((key) => empty.errors[key as 'comment'])).toEqual([
			'in-depth',
			'trust',
			'expertise',
			'punctuality',
			'friendliness'
		]);
		expect(empty.errors.comment).toBeUndefined();
	});

	it('all five given (halves too) and plain words: valid — and the rules agree with the body that travels', () => {
		const filled = form();
		for (const [id, value] of Object.entries(values(10, 9, 10, 7, 8))) {
			filled.setValue(id as 'trust', value);
		}
		filled.setValue('comment', '  Πολύ προσεκτική εξέταση.  ');
		expect(filled.validate()).toBe(true);
		expect(
			toRatingSubmitRequest(ratingValuesOf(filled.values), filled.values.comment)
		).not.toBeNull();
	});

	it('🔴 U-65.6 (negative): `<` or `>` in the words says «Το κείμενο δεν μπορεί να περιέχει τα σύμβολα < και >.» as the field’s error — the words `ratingCommentError` says — and nothing travels', () => {
		const filled = form();
		for (const [id, value] of Object.entries(values(10, 10, 10, 10, 10))) {
			filled.setValue(id as 'trust', value);
		}
		for (const words of ['<script>alert(1)</script>', 'καλός > όλων', ' <b ']) {
			filled.setValue('comment', words);
			expect(filled.validateField('comment')).toBe(
				ratingCommentError(readRatingComment(words), 'el')
			);
			expect(filled.errors.comment).toBe('Το κείμενο δεν μπορεί να περιέχει τα σύμβολα < και >.');
			expect(filled.validate()).toBe(false);
			expect(
				toRatingSubmitRequest(ratingValuesOf(filled.values), filled.values.comment)
			).toBeNull();
		}
		filled.setValue('comment', 'καλός');
		expect(filled.validateField('comment')).toBeUndefined();
	});

	it('🔴 D-W4-36.8 (negative): the 2000 is counted in UTF-16 units — 2000 pass, 2001 do not, 1001 emoji (2002 units) do not; what the field keeps (`clampRatingComment`) always passes', () => {
		const filled = form();
		filled.setValue('comment', 'α'.repeat(2000));
		expect(filled.validateField('comment')).toBeUndefined();
		filled.setValue('comment', 'α'.repeat(2001));
		expect(filled.validateField('comment')).toBe('2000/2000');
		filled.setValue('comment', '😀'.repeat(1001));
		expect(filled.validateField('comment')).toBe('2000/2000');
		filled.setValue('comment', clampRatingComment('😀'.repeat(1001)));
		expect(filled.validateField('comment')).toBeUndefined();
	});

	it('(negative) an aspect out of the server’s range is not given: 0, 11, 4.5, a text', () => {
		const filled = form();
		for (const bad of [0, 11, 4.5, Number.NaN, '7' as unknown as number]) {
			filled.setValue('trust', bad);
			expect(filled.validateField('trust'), String(bad)).toBeDefined();
		}
		filled.setValue('trust', 7);
		expect(filled.validateField('trust')).toBeUndefined();
	});
});
