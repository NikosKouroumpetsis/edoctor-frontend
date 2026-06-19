import { describe, expect, it, vi } from 'vitest';
import { createForm } from './form.svelte';
import { Validators } from './validators';

function makeForm(onSubmit = vi.fn()) {
	return createForm({
		initialValues: { email: '', name: '' },
		validators: {
			email: [Validators.required, Validators.email],
			name: [Validators.required]
		},
		messages: { email: { required: 'Email required', email: 'Bad email' } },
		onSubmit
	});
}

describe('createForm', () => {
	it('seeds values and starts clean', () => {
		const form = makeForm();
		expect(form.values.email).toBe('');
		expect(form.isDirty).toBe(false);
		expect(form.errors.email).toBeUndefined();
	});

	it('does not validate before a field is touched, then validates on blur', () => {
		const form = makeForm();
		const email = form.field('email');
		email.setValue('nope');
		expect(form.errors.email).toBeUndefined(); // untouched -> silent

		email.handleBlur();
		expect(form.errors.email).toBe('Bad email');
	});

	it('re-validates a touched field on input and clears when fixed', () => {
		const form = makeForm();
		const email = form.field('email');
		email.handleBlur(); // touched + required fails
		expect(form.errors.email).toBe('Email required');
		email.setValue('a@b.gr');
		expect(form.errors.email).toBeUndefined();
	});

	it('tracks dirty state per value', () => {
		const form = makeForm();
		expect(form.field('name').dirty).toBe(false);
		form.field('name').setValue('Maria');
		expect(form.field('name').dirty).toBe(true);
		expect(form.isDirty).toBe(true);
	});

	it('handleSubmit validates all, blocks when invalid, and submits when valid', async () => {
		const onSubmit = vi.fn();
		const form = makeForm(onSubmit);
		await form.handleSubmit();
		expect(onSubmit).not.toHaveBeenCalled();
		expect(form.errors.email).toBe('Email required');
		expect(form.errors.name).toBeDefined();

		form.field('email').setValue('a@b.gr');
		form.field('name').setValue('Maria');
		await form.handleSubmit();
		expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.gr', name: 'Maria' });
	});

	it('returns a stable field accessor per name', () => {
		const form = makeForm();
		expect(form.field('email')).toBe(form.field('email'));
	});

	it('reset restores initial values and clears errors/touched', () => {
		const form = makeForm();
		form.field('email').handleBlur();
		form.field('email').setValue('x');
		form.reset();
		expect(form.values.email).toBe('');
		expect(form.errors.email).toBeUndefined();
		expect(form.field('email').touched).toBe(false);
	});
});
