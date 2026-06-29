import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './input-otp.harness.svelte';

describe('InputOTP', () => {
	it('fills slots as digits are typed and fires onComplete when full', async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();
		const { container } = render(Harness, { props: { maxlength: 6, onComplete } });

		await user.click(screen.getByLabelText('One-time passcode'));
		await user.keyboard('123456');

		expect(screen.getByTestId('otp-value')).toHaveTextContent('123456');
		const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');
		expect(Array.from(slots).map((s) => s.textContent?.trim())).toEqual([
			'1',
			'2',
			'3',
			'4',
			'5',
			'6'
		]);
		expect(onComplete).toHaveBeenCalledWith('123456');
	});

	it('rejects characters that do not match the digit pattern', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { maxlength: 6 } });

		await user.click(screen.getByLabelText('One-time passcode'));
		await user.keyboard('a1b2c3');

		expect(screen.getByTestId('otp-value')).toHaveTextContent('123');
	});

	it('does not accept more characters than maxlength', async () => {
		const user = userEvent.setup();
		const onComplete = vi.fn();
		render(Harness, { props: { maxlength: 4, onComplete } });

		await user.click(screen.getByLabelText('One-time passcode'));
		await user.keyboard('123456789');

		expect(screen.getByTestId('otp-value')).toHaveTextContent('1234');
		expect(onComplete).toHaveBeenCalledWith('1234');
	});

	it('shows a dash placeholder in empty slots and the digit once filled', async () => {
		const user = userEvent.setup();
		const { container } = render(Harness, { props: { maxlength: 6 } });
		const slotText = () =>
			Array.from(container.querySelectorAll('[data-slot="input-otp-slot"]')).map((s) =>
				s.textContent?.trim()
			);

		// Unfocused: every slot shows the placeholder dash.
		expect(slotText()).toEqual(['-', '-', '-', '-', '-', '-']);

		await user.click(screen.getByLabelText('One-time passcode'));
		await user.keyboard('84');

		// Filled slots show their digit; trailing empty slots keep the dash.
		const text = slotText();
		expect(text[0]).toBe('8');
		expect(text[1]).toBe('4');
		expect(text.slice(3)).toEqual(['-', '-', '-']);
	});

	it('renders borderless slots (no per-slot divider segments)', () => {
		const { container } = render(Harness, { props: { maxlength: 6 } });
		const slots = container.querySelectorAll('[data-slot="input-otp-slot"]');
		expect(slots).toHaveLength(6);
		slots.forEach((slot) => {
			expect((slot as HTMLElement).className).not.toMatch(/border/);
		});
	});
});
