import { describe, expect, it } from 'vitest';
import { Validators, runValidators } from './validators';

describe('Validators', () => {
	it('required rejects empty strings, arrays and nullish', () => {
		expect(Validators.required('')).toEqual({ required: true });
		expect(Validators.required('   ')).toEqual({ required: true });
		expect(Validators.required([])).toEqual({ required: true });
		expect(Validators.required(null)).toEqual({ required: true });
		expect(Validators.required('x')).toBeNull();
		expect(Validators.required(['a'])).toBeNull();
	});

	it('email validates format and ignores empty (let required own emptiness)', () => {
		expect(Validators.email('a@b.gr')).toBeNull();
		expect(Validators.email('nope')).toEqual({ email: true });
		expect(Validators.email('')).toBeNull();
	});

	it('minLength / maxLength', () => {
		expect(Validators.minLength(3)('ab')).toEqual({ minLength: true });
		expect(Validators.minLength(3)('abc')).toBeNull();
		expect(Validators.maxLength(3)('abcd')).toEqual({ maxLength: true });
	});

	it('passwordStrength enforces upper, lower and digit/symbol', () => {
		expect(Validators.passwordStrength('abc')).toEqual({ passwordStrength: true });
		expect(Validators.passwordStrength('Abc1')).toBeNull();
	});

	it('runValidators merges all failing keys', () => {
		const result = runValidators('a', [
			Validators.required,
			Validators.minLength(3),
			Validators.email
		]);
		expect(result).toEqual({ minLength: true, email: true });
	});

	it('runValidators returns null when all pass', () => {
		expect(runValidators('abc', [Validators.required, Validators.minLength(2)])).toBeNull();
	});
});
