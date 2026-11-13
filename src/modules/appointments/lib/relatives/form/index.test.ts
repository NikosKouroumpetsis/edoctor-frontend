import { describe, expect, it } from 'vitest';
import { runValidators } from '$shared/lib/form';
import {
	bookingGenderOptions,
	bookingRelationshipOptions,
	bookingRelativeFailureMessage,
	bookingRelativeForm,
	bookingRelativeIdMessage,
	emptyBookingRelative,
	keepBookingAfmInput,
	keepBookingAmkaInput,
	readBookingRelativePhone,
	relativeFormValues,
	relativePhoneValue,
	toBookingRelativeInput,
	toRelativeUpdate
} from '.';
import type { RelativeFacts } from '$modules/appointments/api/relatives';

const filled = {
	...emptyBookingRelative,
	firstName: ' Άννα ',
	lastName: 'Παππά',
	relationship: 'CHILD',
	gender: 'FEMALE'
};

/** The first refusal key of each field, as the form would show it. */
function refusals(values: Record<string, string>) {
	const { validators } = bookingRelativeForm('el');
	return Object.fromEntries(
		Object.entries(validators ?? {}).map(([name, list]) => [
			name,
			Object.keys(runValidators(values[name], list ?? []) ?? {})[0] ?? null
		])
	);
}

describe('«Νέος συγγενής» (record §3.3, the application’s relative form)', () => {
	it('the record’s lists: 5 relationships, 4 genders, in the record’s words', () => {
		expect(bookingRelationshipOptions('el').map((option) => option.label)).toEqual([
			'Γονέας',
			'Παιδί',
			'Σύζυγος',
			'Αδελφός/ή',
			'Άλλη σχέση'
		]);
		expect(bookingGenderOptions('el').map((option) => option.value)).toEqual([
			'FEMALE',
			'MALE',
			'NON_BINARY',
			'OTHER_GENE'
		]);
	});

	it('THE body: names trimmed, the enums, every optional field `null` when blank', () => {
		expect(toBookingRelativeInput(filled, { kind: 'absent' })).toEqual({
			firstName: 'Άννα',
			lastName: 'Παππά',
			relationship: 'CHILD',
			gender: 'FEMALE',
			phone: null,
			email: null,
			amka: null,
			afm: null
		});
		expect(
			toBookingRelativeInput(
				{ ...filled, email: ' a@b.gr ', amka: '12345678901', afm: '123456789' },
				{ kind: 'number', value: '+306912345678' }
			)
		).toMatchObject({
			phone: '+306912345678',
			email: 'a@b.gr',
			amka: '12345678901',
			afm: '123456789'
		});
	});

	it('🔴 U-65.6 (negative): what the server would refuse is refused before the write', () => {
		expect(refusals({ ...emptyBookingRelative, relationship: 'COUSIN', gender: 'X' })).toEqual({
			firstName: 'required',
			lastName: 'required',
			relationship: 'required',
			gender: 'required',
			email: null,
			amka: null,
			afm: null
		});
		expect(
			refusals({
				...filled,
				firstName: 'α'.repeat(101),
				email: 'not-an-email',
				amka: '1234567890',
				afm: '12345678a'
			})
		).toMatchObject({ firstName: 'maxLength', email: 'email', amka: 'pattern', afm: 'pattern' });
		// A forged enum, a NUL-only name or a mobile the parser refused never makes a body.
		expect(
			toBookingRelativeInput({ ...filled, relationship: 'ADMIN' }, { kind: 'absent' })
		).toBeNull();
		expect(
			toBookingRelativeInput({ ...filled, firstName: '\u0000' }, { kind: 'absent' })
		).toBeNull();
		expect(toBookingRelativeInput(filled, { kind: 'invalid' })).toBeNull();
	});

	it('U-121.2: each name is ONE word of letters once trimmed — Latin or Greek, polytonic too; an empty one keeps «Συμπληρώστε το …»', () => {
		expect(
			refusals({ ...filled, firstName: ' Ἀλέξανδρος ', lastName: 'Papadopoulou' })
		).toMatchObject({ firstName: null, lastName: null });
		expect(refusals({ ...filled, firstName: '   ', lastName: '' })).toMatchObject({
			firstName: 'required',
			lastName: 'required'
		});
		const { messages } = bookingRelativeForm('el');
		expect(messages?.firstName?.lettersOnly).toBe('Συμπληρώστε ένα όνομα, μόνο με γράμματα.');
		expect(messages?.lastName?.lettersOnly).toBe('Συμπληρώστε ένα επώνυμο, μόνο με γράμματα.');
		expect(messages?.firstName?.required).toBe('Συμπληρώστε το όνομα.');
		expect(bookingRelativeForm('en').messages?.lastName?.lettersOnly).toBe(
			'Enter one last name, letters only.'
		);
	});

	it('U-121.2 (negative): two names, a hyphen, an apostrophe, a digit, markup or another script is refused before the write', () => {
		for (const name of ['Κύματος Τρία', 'Anna-Maria', "O'Brien", 'Anna2', '<b>x</b>', 'Анна']) {
			expect(refusals({ ...filled, firstName: name, lastName: name }), name).toMatchObject({
				firstName: 'lettersOnly',
				lastName: 'lettersOnly'
			});
		}
		// A name too long AND of two words says the letters first (the 100 stops typing anyway).
		expect(refusals({ ...filled, lastName: `${'α'.repeat(60)} ${'β'.repeat(60)}` })).toMatchObject({
			lastName: 'lettersOnly'
		});
	});

	it('U-121.3: after their 11 / 9 digits, the ΑΜΚΑ’s date and the ΑΦΜ’s check digit (synthetic numbers only)', () => {
		expect(refusals({ ...filled, amka: '29029012345', afm: '123456783' })).toMatchObject({
			amka: null,
			afm: null
		});
		const { messages } = bookingRelativeForm('el');
		expect(messages?.amka).toEqual({
			pattern: 'Το ΑΜΚΑ έχει 11 ψηφία.',
			amkaDate: 'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		});
		expect(messages?.afm).toEqual({
			pattern: 'Το ΑΦΜ έχει 9 ψηφία.',
			afmCheckDigit: 'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		});
		expect(bookingRelativeForm('en').messages?.afm?.afmCheckDigit).toBe(
			'This tax number isn’t valid. Check the digits.'
		);
	});

	it('U-121.3 (negative): a wrong date or check digit is refused before the write; a wrong length stays the length’s words', () => {
		expect(refusals({ ...filled, amka: '30029012345', afm: '123456789' })).toMatchObject({
			amka: 'amkaDate',
			afm: 'afmCheckDigit'
		});
		expect(refusals({ ...filled, amka: '9999999999', afm: '99999999' })).toMatchObject({
			amka: 'pattern',
			afm: 'pattern'
		});
	});

	it('U-121.3: a refused ΑΜΚΑ / ΑΦΜ says its length’s words, or «δεν είναι έγκυρο» when the server found it invalid', () => {
		expect(bookingRelativeIdMessage('amka', false, 'el')).toBe('Το ΑΜΚΑ έχει 11 ψηφία.');
		expect(bookingRelativeIdMessage('amka', true, 'el')).toBe(
			'Το ΑΜΚΑ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		);
		expect(bookingRelativeIdMessage('afm', false, 'el')).toBe('Το ΑΦΜ έχει 9 ψηφία.');
		expect(bookingRelativeIdMessage('afm', true, 'el')).toBe(
			'Το ΑΦΜ δεν είναι έγκυρο. Ελέγξτε τα ψηφία.'
		);
		expect(bookingRelativeIdMessage('amka', true, 'en')).toBe(
			'This AMKA isn’t valid. Check the digits.'
		);
	});

	it('the optional mobile: blank is absent, not wrong; typed but refused is invalid', () => {
		expect(readBookingRelativePhone('  ', null)).toEqual({ kind: 'absent' });
		expect(readBookingRelativePhone('69', null)).toEqual({ kind: 'invalid' });
		expect(readBookingRelativePhone('6912345678', '+306912345678')).toEqual({
			kind: 'number',
			value: '+306912345678'
		});
	});

	it('🔴 D-W3-32: the 21st relative has its own words, any other refused field the general ones; too many writes their own; the session none', () => {
		expect(bookingRelativeFailureMessage('limit', 'el')).toBe(
			'Έχετε φτάσει τον μέγιστο αριθμό συγγενών.'
		);
		expect(bookingRelativeFailureMessage('limit', 'en')).toBe(
			'You’ve reached the maximum number of relatives.'
		);
		expect(bookingRelativeFailureMessage('invalid', 'el')).toBe(
			'Ελέγξτε τα στοιχεία που συμπληρώσατε και δοκιμάστε ξανά.'
		);
		expect(bookingRelativeFailureMessage('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(bookingRelativeFailureMessage('session', 'el')).toBeNull();
		expect(bookingRelativeFailureMessage('unknown', 'el')).toBe(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
	});

	it('A7: the ΑΜΚΑ keeps only its digits as it is typed or pasted, eleven at most — a letter, a dash, a space or a script leaves nothing', () => {
		expect(keepBookingAmkaInput('12a3')).toBe('123');
		expect(keepBookingAmkaInput('120 485-123 45')).toBe('12048512345');
		expect(keepBookingAmkaInput('123456789012345')).toBe('12345678901');
		expect(keepBookingAmkaInput('<script>1</script>')).toBe('1');
		expect(keepBookingAmkaInput('αβγ')).toBe('');
		expect(keepBookingAmkaInput('١٢٣')).toBe('');
	});

	it('W8 Delta 1: the ΑΦΜ keeps only its digits as it is typed or pasted, nine at most — a letter, a dash, a space or a script leaves nothing', () => {
		// U-121.3: synthetic numbers only (123456783: the check digit of 12345678 by the rule), never a real one.
		expect(keepBookingAfmInput('12a')).toBe('12');
		expect(keepBookingAfmInput('123 456-783')).toBe('123456783');
		expect(keepBookingAfmInput('1234567831234')).toBe('123456783');
		expect(keepBookingAfmInput('EL123456783')).toBe('123456783');
		expect(keepBookingAfmInput('<b>1</b>')).toBe('1');
		expect(keepBookingAfmInput('١٢٣')).toBe('');
	});
});

describe('screen 55 · «Επεξεργασία συγγενή» (P-W4 §4.6, D-78)', () => {
	const anna: RelativeFacts = {
		relativeId: 'rel-2',
		firstName: 'Άννα',
		lastName: 'Παππά',
		relationship: 'PARENT',
		gender: 'FEMALE',
		phone: '+306941234567',
		email: 'anna@example.test',
		amkaMasked: '•••••••2345',
		afmMasked: null
	};
	const greek = (stored: string) =>
		stored.startsWith('+30') ? { dialCode: '+30', national: stored.slice(3) } : null;

	// «U-168: τα πεδία ανοίγουν άδεια» — the mask on file («•••••••2345») is never a field's value.
	it('🔴 U-168 · D-W45-14: the form starts from what is on file, every optional field blank when none — and the ΑΜΚΑ / ΑΦΜ EMPTY whatever is on file', () => {
		expect(relativeFormValues(anna)).toEqual({
			firstName: 'Άννα',
			lastName: 'Παππά',
			relationship: 'PARENT',
			gender: 'FEMALE',
			email: 'anna@example.test',
			amka: '',
			afm: ''
		});
	});

	it('the stored mobile split by its country; one without `+` tried as international; (negative) an unknown code stays whole beside the default', () => {
		expect(relativePhoneValue('+306941234567', greek, '+30')).toEqual({
			dialCode: '+30',
			number: '6941234567'
		});
		expect(relativePhoneValue('306941234567', greek, '+30')).toEqual({
			dialCode: '+30',
			number: '6941234567'
		});
		expect(relativePhoneValue('+9991234', greek, '+30')).toEqual({
			dialCode: '+30',
			number: '+9991234'
		});
		expect(relativePhoneValue(null, greek, '+30')).toEqual({ dialCode: '+30', number: '' });
	});

	it('only what differs from what is on file travels — trimmed names, an emptied optional field as `null`; `{}` for nothing', () => {
		const values = relativeFormValues(anna);
		const same = { kind: 'number' as const, value: '+306941234567' };
		expect(toRelativeUpdate(values, same, anna)).toEqual({});
		expect(
			toRelativeUpdate({ ...values, lastName: ' Γεωργίου ', email: '  ' }, same, anna)
		).toEqual({ lastName: 'Γεωργίου', email: null });
		expect(toRelativeUpdate(values, { kind: 'absent' }, anna)).toEqual({ phone: null });
		expect(
			toRelativeUpdate(
				{ ...values, relationship: 'CHILD', gender: 'MALE', amka: '01019012345' },
				same,
				anna
			)
		).toEqual({ relationship: 'CHILD', gender: 'MALE', amka: '01019012345' });
	});

	it('🔴 D-W45-14: ΑΜΚΑ / ΑΦΜ — an empty field is UNTOUCHED (never `null`), a number typed travels, «Αφαίρεση» sends `null`; a number typed after «Αφαίρεση» wins', () => {
		const values = relativeFormValues(anna);
		const same = { kind: 'number' as const, value: '+306941234567' };
		// Anna has an ΑΜΚΑ on file and the field is empty: nothing of it travels, so the server keeps it.
		expect(toRelativeUpdate(values, same, anna)).toEqual({});
		expect(toRelativeUpdate({ ...values, lastName: 'Γεωργίου' }, same, anna)).toEqual({
			lastName: 'Γεωργίου'
		});
		expect(toRelativeUpdate({ ...values, afm: '123456783' }, same, anna)).toEqual({
			afm: '123456783'
		});
		expect(toRelativeUpdate(values, same, anna, ['amka'])).toEqual({ amka: null });
		expect(toRelativeUpdate(values, same, anna, ['amka', 'afm'])).toEqual({
			amka: null,
			afm: null
		});
		expect(toRelativeUpdate({ ...values, amka: '01019012345' }, same, anna, ['amka'])).toEqual({
			amka: '01019012345'
		});
		// (negative) the mask is never sent back as a number.
		expect(JSON.stringify(toRelativeUpdate(values, same, anna, ['afm']))).not.toContain('•');
	});

	it('🔴 U-65.6 (negative): a form that cannot be whole sends nothing — a refused mobile, an empty name, a relationship off the list', () => {
		const values = relativeFormValues(anna);
		expect(toRelativeUpdate(values, { kind: 'invalid' }, anna)).toBeNull();
		expect(toRelativeUpdate({ ...values, firstName: '  ' }, { kind: 'absent' }, anna)).toBeNull();
		expect(
			toRelativeUpdate({ ...values, relationship: 'COUSIN' }, { kind: 'absent' }, anna)
		).toBeNull();
	});
});
