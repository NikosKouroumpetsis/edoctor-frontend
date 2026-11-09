import { describe, expect, it } from 'vitest';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import {
	buildDoctorOnboardingDoneContent,
	buildDoctorOnboardingIntro,
	buildDoctorOnboardingOverviewContent,
	buildDoctorOnboardingStages
} from '.';

describe('doctor-onboarding · lib/content (record §6.4, strings «33 · overview»)', () => {
	it('«Ξεκινήστε» for a sign-up never started (and a guest)', () => {
		expect(buildDoctorOnboardingOverviewContent(null, 'el')).toEqual({
			button: 'Ξεκινήστε',
			notice: null,
			resume: null,
			resumeDeadline: null
		});
	});

	it('«Συνέχεια», the resume line and the day it would be deleted, on the platform’s calendar', () => {
		expect(
			buildDoctorOnboardingOverviewContent(
				{ state: 'IN_PROGRESS', deleteAfter: '2027-02-07T23:30:00.000Z' },
				'el'
			)
		).toEqual({
			button: 'Συνέχεια',
			notice: null,
			resume: 'Έχετε μια εγγραφή σε εξέλιξη. Συνεχίζετε από εκεί που μείνατε.',
			resumeDeadline:
				'Αν δεν την ολοκληρώσετε έως 8 Φεβρουαρίου 2027, θα διαγραφεί και θα χρειαστεί να ξεκινήσετε από την αρχή.'
		});
	});

	it('a finished or a locked sign-up says so and offers no button', () => {
		expect(
			buildDoctorOnboardingOverviewContent({ state: 'COMPLETED', deleteAfter: null }, 'el')
		).toMatchObject({
			button: null,
			notice:
				'Η εγγραφή σας έχει ολοκληρωθεί. Θα σας ενημερώσουμε με email μόλις ενεργοποιηθεί ο λογαριασμός σας.'
		});
		expect(
			buildDoctorOnboardingOverviewContent({ state: 'LOCKED', deleteAfter: null }, 'en')
		).toMatchObject({
			button: null,
			notice: expect.stringContaining('three times')
		});
	});

	it('(negative) a deadline that is no instant says no day', () => {
		expect(
			buildDoctorOnboardingOverviewContent({ state: 'IN_PROGRESS', deleteAfter: 'soon' }, 'el')
				.resumeDeadline
		).toBeNull();
	});

	it('the three stages and «Βήμα N»', () => {
		expect(buildDoctorOnboardingStages('el').map((stage) => stage.title)).toEqual([
			'Πείτε μας για εσάς',
			'Το ιατρείο σας',
			'Τελειώνουμε'
		]);
		expect(buildDoctorOnboardingIntro(1, 'en')).toMatchObject({
			eyebrow: 'Step 2',
			title: 'Your office'
		});
	});
	it('«Λάβαμε την αίτησή σας»: the thanks with «Dr. {name}» (U-99.1) and «Τι ακολουθεί» in three points, in both languages', () => {
		const progress = doctorOnboardingProgressSample({ state: 'COMPLETED' });
		expect(buildDoctorOnboardingDoneContent(progress, 'el')).toEqual({
			title: 'Λάβαμε την αίτησή σας',
			body: 'Ευχαριστούμε, Dr. Μαρία Τριανταφύλλου. Η εγγραφή σας ολοκληρώθηκε.',
			nextTitle: 'Τι ακολουθεί',
			next: [
				'Θα λάβετε email επιβεβαίωσης.',
				'Ένας συνεργάτης του eDoctor θα επικοινωνήσει μαζί σας για να ελέγξει τα στοιχεία σας.',
				'Μόλις ενεργοποιηθεί ο λογαριασμός σας, θα σας ενημερώσουμε με email.'
			]
		});
		expect(buildDoctorOnboardingDoneContent(progress, 'en').body).toBe(
			'Thank you, Dr. Μαρία Τριανταφύλλου. Your sign-up is complete.'
		);
	});

	it('(negative) a name that already wears its title keeps one; a hostile name stays plain words', () => {
		const titled = doctorOnboardingProgressSample({
			basicInfo: { firstName: 'Δρ. Νίκος', lastName: 'Π.', dateOfBirth: null, gender: null }
		});
		expect(buildDoctorOnboardingDoneContent(titled, 'el').body).toBe(
			'Ευχαριστούμε, Δρ. Νίκος Π.. Η εγγραφή σας ολοκληρώθηκε.'
		);
		const hostile = doctorOnboardingProgressSample({
			basicInfo: { firstName: '<img src=x>', lastName: null, dateOfBirth: null, gender: null }
		});
		expect(buildDoctorOnboardingDoneContent(hostile, 'el').body).toContain('Dr. <img src=x>');
	});
});
