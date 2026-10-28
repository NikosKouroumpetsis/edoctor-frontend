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

	// U-07.1: the application's sizes (the row's resting height, inset and digits; the web had one fixed row) and its
	// `invalid` (the danger border and aria-invalid).
	it('U-07.1: md by default, sm / lg as the application’s, the corner md', () => {
		const md = render(Harness);
		const row = () => document.querySelector('[data-slot="input-otp"]') as HTMLElement;
		const slot = () => document.querySelector('[data-slot="input-otp-slot"]') as HTMLElement;
		expect(row()).toHaveClass('min-h-control-lg', 'px-4', 'rounded-md', 'border-input');
		expect(row()).not.toHaveClass('h-control-md', 'rounded-lg');
		expect(slot()).toHaveClass('text-title-sm');
		md.unmount();
		const sm = render(Harness, { props: { size: 'sm' } });
		expect(row()).toHaveClass('min-h-control-md', 'px-3');
		sm.unmount();
		render(Harness, { props: { size: 'lg' } });
		expect(row()).toHaveClass('min-h-control-xl', 'px-5');
		expect(slot()).toHaveClass('text-title-md');
	});

	it('U-07.1: invalid draws the danger border and says aria-invalid', () => {
		render(Harness, { props: { invalid: true } });
		expect(document.querySelector('[data-slot="input-otp"]')).toHaveClass('border-danger');
		expect(screen.getByLabelText('One-time passcode')).toHaveAttribute('aria-invalid', 'true');
	});
});
