import { describe, expect, it } from 'vitest';
import {
	composeBirthDate,
	daysInMonth,
	emptyIdentityValues,
	readIdentityProblems,
	readPasswordProblem,
	toIdentitySubmission
} from '.';

describe('auth::lib::identity (app = web)', () => {
	it('a new password: at least 8, with upper case, lower case and a digit or a symbol', () => {
		expect(readPasswordProblem('')).toBe('too-short');
		expect(readPasswordProblem('Aa1')).toBe('too-short');
		expect(readPasswordProblem('alllowercase1')).toBe('too-weak');
		expect(readPasswordProblem('ALLUPPER1')).toBe('too-weak');
		expect(readPasswordProblem('NoDigitsHere')).toBe('too-weak');
		expect(readPasswordProblem('Secret-pass')).toBeNull();
		expect(readPasswordProblem('Secret123')).toBeNull();
	});

	it('the name and the date are required, the gender never; blanks count as nothing', () => {
		expect(readIdentityProblems(emptyIdentityValues)).toEqual({
			firstName: true,
			lastName: true,
			birthDate: true
		});
		expect(
			readIdentityProblems({
				firstName: '  ',
				lastName: 'Π',
				birthDate: '1990-01-01',
				gender: ''
			})
		).toEqual({ firstName: true });
	});

	it('the submission: the day as an instant at UTC, trimmed names, the backend’s name of the gender, none when unanswered', () => {
		expect(
			toIdentitySubmission({
				firstName: ' Μαρία ',
				lastName: 'Π',
				birthDate: '1990-03-05',
				gender: 'OTHER'
			})
		).toEqual({
			dateOfBirth: '1990-03-05T00:00:00.000Z',
			firstName: 'Μαρία',
			lastName: 'Π',
			gender: 'OTHER_GENE'
		});
		expect(
			toIdentitySubmission({ firstName: 'Α', lastName: 'Β', birthDate: '2000-01-01', gender: '' })
		).not.toHaveProperty('gender');
	});

	it('the picker’s day is capped to its month', () => {
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(composeBirthDate(2023, 2, 31)).toBe('2023-02-28');
		expect(composeBirthDate(1990, 11, 5)).toBe('1990-11-05');
	});
});
