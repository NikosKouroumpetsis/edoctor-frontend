import { describe, expect, it } from 'vitest';
import type { PersonalPerson } from '$modules/profile/types';
import {
	buildPersonalRows,
	cleanPersonalCode,
	keepPersonalIdInput,
	personalBirthDateWords,
	personalChallengeMessage,
	personalGenderOptions,
	personalIdLabel,
	personalIdMessage,
	personalPhoneDestination,
	personalResendDeadline,
	personalResendSecondsLeft,
	personalResendWaitLabel,
	personalWriteFailureMessage,
	toBirthDateInstant,
	toNamePatch
} from '.';

const el = { locale: 'el' as const };
const en = { locale: 'en' as const };

/* A made-up person; the masks are the server's own text (U-168), never worked out here. */
const eleni: PersonalPerson = {
	hasPatientProfile: true,
	firstName: 'Ελένη',
	lastName: 'Παππά',
	gender: 'FEMALE',
	birthDate: '1988-03-14',
	maskedEmail: 'e***a@example.gr',
	maskedPhone: '+30 *** *** 4567',
	maskedAmka: '•••••••2345',
	maskedAfm: null
};

describe('modules/profile/lib/personal · screen 58 «Προσωπικά στοιχεία» (record §5.3)', () => {
	it('the seven rows in the record’s order — «title · value · Επεξεργασία», or «Δεν έχει δοθεί · Προσθήκη» — each with its line of help', () => {
		expect(buildPersonalRows(eleni, el)).toEqual([
			{
				id: 'name',
				title: 'Ονοματεπώνυμο',
				value: 'Ελένη Παππά',
				help: 'Όπως θα το βλέπει ο γιατρός στα ραντεβού σας.',
				filled: true
			},
			{
				id: 'dob',
				title: 'Ημερομηνία γέννησης',
				value: '14 Μαρτίου 1988',
				help: 'Τη βλέπει ο γιατρός όταν κλείνετε ραντεβού.',
				filled: true
			},
			{ id: 'gender', title: 'Φύλο', value: 'Γυναίκα', help: null, filled: true },
			{
				id: 'email',
				title: 'Διεύθυνση email',
				value: 'e***a@example.gr',
				help: 'Γράψτε ένα email στο οποίο έχετε πάντα πρόσβαση. Θα στείλουμε εκεί έναν κωδικό· μέχρι να τον δώσετε, ισχύει το παλιό.',
				filled: true
			},
			{
				id: 'phone',
				title: 'Κινητό',
				value: '+30 *** *** 4567',
				help: 'Με αυτό μπορείτε να συνδέεστε και να λαμβάνετε SMS για τα ραντεβού σας. Θα στείλουμε έναν κωδικό με SMS για να το επαληθεύσουμε.',
				filled: true
			},
			{
				id: 'amka',
				title: 'ΑΜΚΑ',
				value: '•••••••2345',
				help: 'Το βλέπει ο γιατρός όταν κλείνετε ραντεβού.',
				filled: true
			},
			{
				id: 'afm',
				title: 'ΑΦΜ',
				value: 'Δεν έχει δοθεί',
				help: 'Το βλέπει ο γιατρός όταν κλείνετε ραντεβού.',
				filled: false
			}
		]);
	});

	it('🔴 U-168: τα στοιχεία φαίνονται όπως τα στέλνει ο server — a mask is printed as it came, nothing is hidden or shown again here', () => {
		const odd = { ...eleni, maskedEmail: 'el***@example.gr', maskedAmka: '***2345' };
		const rows = buildPersonalRows(odd, el);
		expect(rows.find((row) => row.id === 'email')?.value).toBe('el***@example.gr');
		expect(rows.find((row) => row.id === 'amka')?.value).toBe('***2345');
	});

	it('an account with nothing optional given: «Δεν έχει δοθεί · Προσθήκη» on each such row; in English the application’s words', () => {
		const bare: PersonalPerson = {
			...eleni,
			gender: null,
			birthDate: null,
			maskedPhone: null,
			maskedAmka: null
		};
		expect(
			buildPersonalRows(bare, el)
				.filter((row) => !row.filled)
				.map((row) => [row.id, row.value])
		).toEqual([
			['dob', 'Δεν έχει δοθεί'],
			['gender', 'Δεν έχει δοθεί'],
			['phone', 'Δεν έχει δοθεί'],
			['amka', 'Δεν έχει δοθεί'],
			['afm', 'Δεν έχει δοθεί']
		]);
		expect(buildPersonalRows(bare, en).map((row) => [row.title, row.value])).toEqual([
			['Full name', 'Ελένη Παππά'],
			['Date of birth', 'Not provided'],
			['Gender', 'Not provided'],
			['Email address', 'e***a@example.gr'],
			['Mobile', 'Not provided'],
			['AMKA', 'Not provided'],
			['Tax number (AFM)', 'Not provided']
		]);
	});

	it('card w45-w5, rule 9: an account the server names NO patient for reads only the rows that have a source — the date of birth, the gender, the email, the mobile — and the page says no value it cannot know (never «Δεν έχει δοθεί» of an address that may exist)', () => {
		const doctor: PersonalPerson = {
			hasPatientProfile: false,
			firstName: null,
			lastName: null,
			gender: 'MALE',
			birthDate: null,
			maskedEmail: null,
			maskedPhone: null,
			maskedAmka: null,
			maskedAfm: null
		};
		expect(buildPersonalRows(doctor, el).map((row) => [row.id, row.value, row.filled])).toEqual([
			['dob', 'Δεν έχει δοθεί', false],
			['gender', 'Άνδρας', true],
			['email', null, true],
			['phone', null, true]
		]);
	});

	it('🔴 U-164.1 (negative): no row, title or help of a doctor’s in the user’s screen', () => {
		expect(JSON.stringify(buildPersonalRows(eleni, el))).not.toMatch(/ιατρεί|ειδικότητ|ταμείο/iu);
	});

	it('the day of birth in words, in the page’s language; what is no day is none', () => {
		expect(personalBirthDateWords('1988-03-14', 'el')).toBe('14 Μαρτίου 1988');
		expect(personalBirthDateWords('1988-03-14', 'en')).toBe('14 March 1988');
		expect(personalBirthDateWords('2000-01-01', 'el')).toBe('1 Ιανουαρίου 2000');
		for (const value of [null, '', '14/03/1988', '1988-3-14', '<b>', '1988-03-14T00:00:00Z']) {
			expect(personalBirthDateWords(value, 'el'), String(value)).toBeNull();
		}
		expect(toBirthDateInstant('1988-03-14')).toBe('1988-03-14T00:00:00.000Z');
	});

	it('«Φύλο»: the contract’s four, in the record’s order (U-112: one under the other)', () => {
		expect(personalGenderOptions(el)).toEqual([
			{ value: 'FEMALE', label: 'Γυναίκα' },
			{ value: 'MALE', label: 'Άνδρας' },
			{ value: 'NON_BINARY', label: 'Μη δυαδικό' },
			{ value: 'OTHER_GENE', label: 'Άλλο' }
		]);
	});

	it('a name travels trimmed, both halves together, and only when it differs from what is on file', () => {
		const stored = { firstName: 'Ελένη', lastName: 'Παππά' };
		expect(toNamePatch({ firstName: ' Ελένη ', lastName: 'Παππά' }, stored)).toBeNull();
		expect(toNamePatch({ firstName: 'Ελένη', lastName: ' Γεωργίου ' }, stored)).toEqual({
			firstName: 'Ελένη',
			lastName: 'Γεωργίου'
		});
		expect(
			toNamePatch({ firstName: 'Μαρία', lastName: 'Νέα' }, { firstName: null, lastName: null })
		).toEqual({ firstName: 'Μαρία', lastName: 'Νέα' });
	});

	it('🔴 U-65.6: an ΑΜΚΑ / ΑΦΜ field keeps its digits alone, 11 / 9 at most; the code its six', () => {
		expect(keepPersonalIdInput('amka', ' 0101-9012 345 99')).toBe('01019012345');
		expect(keepPersonalIdInput('afm', 'EL123456783<b>')).toBe('123456783');
		expect(keepPersonalIdInput('afm', '١٢٣')).toBe('');
		expect(cleanPersonalCode(' 12a3-45 6789')).toBe('123456');
		expect(cleanPersonalCode('<script>')).toBe('');
		expect(cleanPersonalCode('１２３')).toBe('');
	});

	it('the field’s label: «Νέο ΑΜΚΑ · 11 ψηφία» over a number on file, «11 ψηφία» over none; its refusals in the relative’s own words', () => {
		expect(personalIdLabel('amka', true, el)).toBe('Νέο ΑΜΚΑ · 11 ψηφία');
		expect(personalIdLabel('amka', false, el)).toBe('11 ψηφία');
		expect(personalIdLabel('afm', true, el)).toBe('Νέο ΑΦΜ · 9 ψηφία');
		expect(personalIdLabel('afm', false, el)).toBe('9 ψηφία');
		expect(personalIdMessage('amka', 'length', el)).toBe('Το ΑΜΚΑ έχει 11 ψηφία.');
		expect(personalIdMessage('afm', 'length', el)).toBe('Το ΑΦΜ έχει 9 ψηφία.');
		expect(personalIdMessage('amka', 'invalid', el)).toBe(
			'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		);
		expect(personalIdMessage('afm', 'invalid', el)).toBe(
			'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		);
	});

	// The server's table (`w45-58-clients-common.md`), el word for word.
	it.each([
		['taken', 'email', 'value', 'Αυτό το email χρησιμοποιείται ήδη από άλλον λογαριασμό.'],
		['taken', 'phone', 'value', 'Αυτό το κινητό χρησιμοποιείται ήδη σε άλλον λογαριασμό.'],
		[
			'provider-google',
			'email',
			'value',
			'Συνδέεστε με Google. Για να αλλάξετε email, αποσυνδέστε πρώτα το Google από το «Σύνδεση και ασφάλεια».'
		],
		[
			'provider-apple',
			'email',
			'value',
			'Συνδέεστε με Apple. Για να αλλάξετε email, αποσυνδέστε πρώτα το Apple από το «Σύνδεση και ασφάλεια».'
		],
		[
			'provider-both',
			'email',
			'value',
			'Συνδέεστε με Google και Apple. Για να αλλάξετε email, αποσυνδέστε τα πρώτα από το «Σύνδεση και ασφάλεια».'
		],
		['invalid-value', 'email', 'value', 'Γράψτε ένα έγκυρο email.'],
		['invalid-value', 'phone', 'value', 'Γράψτε ένα έγκυρο κινητό, π.χ. 6941234567.'],
		['invalid-value', 'email', 'code', 'Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.'],
		['invalid-code', 'email', 'code', 'Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.'],
		['stale-code', 'phone', 'code', 'Ο κωδικός έληξε. Ζητήστε καινούριο.'],
		['rate-limited', 'email', 'code', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		['unknown', 'email', 'value', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	] as const)(
		'a refused step «%s» of the %s’s challenge, on step «%s»: «%s»',
		(kind, channel, step, words) => {
			expect(personalChallengeMessage(kind, channel, step, el)).toBe(words);
		}
	);

	it('the session has no words of its own (the sign-in opens); a refused write says the date’s or the general ones', () => {
		expect(personalChallengeMessage('session', 'email', 'value', el)).toBeNull();
		expect(personalWriteFailureMessage('session', el)).toBeNull();
		expect(personalWriteFailureMessage('birth-date', el)).toBe(
			'Μη έγκυρη ημερομηνία γέννησης. Επιλέξτε ημερομηνία έως σήμερα και όχι παλαιότερη από 120 χρόνια.'
		);
		expect(personalWriteFailureMessage('invalid', el)).toBe('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
		expect(personalWriteFailureMessage('unknown', en)).toBe('Something went wrong. Try again.');
	});

	it('«Αποστολή ξανά» waits 60 seconds after a send; a second begun counts whole; singular only for one', () => {
		const now = 1_000_000;
		const deadline = personalResendDeadline(now);
		expect(personalResendSecondsLeft(deadline, now)).toBe(60);
		expect(personalResendSecondsLeft(deadline, now + 59_001)).toBe(1);
		expect(personalResendSecondsLeft(deadline, now + 60_000)).toBe(0);
		expect(personalResendSecondsLeft(null, now)).toBe(0);
		expect(personalResendWaitLabel(1, el)).toBe('Περιμένετε 1 δευτερόλεπτο για νέο κωδικό.');
		expect(personalResendWaitLabel(30, el)).toBe('Περιμένετε 30 δευτερόλεπτα για νέο κωδικό.');
	});

	it('where a code to a mobile went: the country and the last four digits of what was just typed', () => {
		expect(personalPhoneDestination('+30', '697 765 4321')).toBe('+30 *** *** 4321');
	});
});
