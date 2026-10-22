import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { page } from '$app/state';
import { createForm, Validators } from '$shared/lib/form';
import Stepper from './stepper.svelte';

const TITLE = 'Ελάχιστος χρόνος πριν την κράτηση (ώρες)';
const HELP = 'Πόσες ώρες πριν σταματά η κράτηση για μια ώρα (0-72).';

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function renderStepper(props: Record<string, unknown> = {}) {
	return render(Stepper, {
		props: { label: TITLE, helperText: HELP, min: 0, max: 72, value: '2', ...props }
	});
}

const spinbutton = () => screen.getByRole('spinbutton');
const decrease = () => screen.getByRole('button', { name: 'Μείωση' });
const increase = () => screen.getByRole('button', { name: 'Αύξηση' });

afterEach(() => {
	visit('/');
});

describe('Stepper', () => {
	it('S-26.4: the stepper puts − left of the number, the number centred, + right', () => {
		renderStepper();

		const box = spinbutton().parentElement as HTMLElement;
		expect(Array.from(box.children)).toEqual([decrease(), spinbutton(), increase()]);
		expect(box).toHaveClass('flex', 'items-center');
		expect(spinbutton()).toHaveClass('flex-1', 'text-center');
		expect(spinbutton()).toHaveValue('2');
	});

	it('S-26.4: − and + are touch-size targets with localised accessible names', () => {
		visit('/doctors');
		const greek = renderStepper();

		for (const button of [decrease(), increase()]) expect(button).toHaveClass('size-touch');
		expect(screen.queryByRole('button', { name: 'Decrease' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Increase' })).not.toBeInTheDocument();
		greek.unmount();

		visit('/en/doctors');
		renderStepper();

		expect(screen.getByRole('button', { name: 'Decrease' })).toHaveClass('size-touch');
		expect(screen.getByRole('button', { name: 'Increase' })).toHaveClass('size-touch');
		expect(screen.queryByRole('button', { name: 'Μείωση' })).not.toBeInTheDocument();
	});

	it('S-26.4: the stepper title sits above the box and is never truncated', () => {
		renderStepper();

		const title = screen.getByText(TITLE);
		const root = title.parentElement as HTMLElement;
		const box = spinbutton().parentElement as HTMLElement;

		expect(title.tagName).toBe('LABEL');
		expect(screen.getByLabelText(TITLE)).toBe(spinbutton());
		expect(Array.from(root.children).slice(0, 2)).toEqual([title, box]);
		expect(root).toHaveClass('flex-col');
		expect(title.className).not.toMatch(
			/truncate|line-clamp|text-ellipsis|whitespace-nowrap|overflow-hidden/
		);
		expect(screen.getByText(HELP).previousElementSibling).toBe(box);
	});

	it('S-26.4: − is disabled at min and + at max', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({ min: 1, max: 3, value: '1' });

		expect(decrease()).toBeDisabled();
		expect(increase()).toBeEnabled();

		await user.click(decrease());
		expect(spinbutton()).toHaveValue('1');

		await user.click(increase());
		await user.click(increase());

		expect(spinbutton()).toHaveValue('3');
		expect(increase()).toBeDisabled();
		expect(decrease()).toBeEnabled();

		await user.click(increase());
		expect(spinbutton()).toHaveValue('3');
	});

	/**
	 * 🔴 S-26.4 (app R1 MAJOR-1): the number is ONE spinbutton named by the title; it is said as the screen shows it
	 * (`aria-valuetext`), never left to a numeric or percentage reading, and ArrowUp / ArrowDown step it.
	 */
	it('S-26.4: a screen reader adjusts the number as ONE element and hears it as shown, never as a percentage', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({ value: '5' });

		expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
		expect(spinbutton()).toHaveAccessibleName(TITLE);
		expect(spinbutton()).toHaveAccessibleDescription(HELP);
		expect(spinbutton()).toHaveAttribute('aria-valuemin', '0');
		expect(spinbutton()).toHaveAttribute('aria-valuemax', '72');
		expect(spinbutton()).toHaveAttribute('aria-valuenow', '5');
		expect(spinbutton()).toHaveAttribute('aria-valuetext', '5');

		spinbutton().focus();
		await user.keyboard('{ArrowUp}');
		expect(spinbutton()).toHaveValue('6');
		expect(spinbutton()).toHaveAttribute('aria-valuetext', '6');

		await user.keyboard('{ArrowDown}{ArrowDown}');
		expect(spinbutton()).toHaveValue('4');
		expect(spinbutton()).toHaveAttribute('aria-valuenow', '4');
	});

	it('S-26.4: a blank or out-of-range number is said as the screen shows it, never «0» or silence', () => {
		const blank = renderStepper({ value: '' });

		expect(spinbutton()).toHaveAttribute('aria-valuetext', 'Κενό');
		expect(spinbutton()).not.toHaveAttribute('aria-valuenow');
		blank.unmount();

		visit('/en/doctors');
		const english = renderStepper({ value: '' });
		expect(spinbutton()).toHaveAttribute('aria-valuetext', 'Empty');
		english.unmount();

		renderStepper({ value: '99' });
		expect(spinbutton()).toHaveAttribute('aria-valuetext', '99');
		expect(spinbutton()).toHaveAttribute('aria-valuenow', '99');
	});

	it('steps by `step` and clamps to the bounds', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({ min: 0, max: 10, step: 4, value: '8' });

		await user.click(increase());
		expect(spinbutton()).toHaveValue('10');

		await user.click(decrease());
		await user.click(decrease());
		await user.click(decrease());
		expect(spinbutton()).toHaveValue('0');
		expect(decrease()).toBeDisabled();
	});

	it('passes typed digits through as they are, so the form validates them', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({ value: '' });

		expect(decrease()).toBeDisabled();
		expect(spinbutton()).toHaveAttribute('inputmode', 'numeric');

		await user.type(spinbutton(), '99');

		expect(spinbutton()).toHaveValue('99');
		expect(increase()).toBeDisabled();
		await user.click(decrease());
		expect(spinbutton()).toHaveValue('72');
	});

	it('disables both buttons and the input when disabled, and shows an error under the box', () => {
		renderStepper({ disabled: true, error: 'Από 0 έως 72' });

		expect(decrease()).toBeDisabled();
		expect(increase()).toBeDisabled();
		expect(spinbutton()).toBeDisabled();
		expect(spinbutton()).toHaveAttribute('aria-invalid', 'true');
		expect(spinbutton()).toHaveAccessibleDescription('Από 0 έως 72');
		expect(screen.queryByText(HELP)).not.toBeInTheDocument();
		expect(spinbutton().parentElement).toHaveClass('border-destructive');
		expect(spinbutton().parentElement).not.toHaveClass('focus-within:border-ring');
	});

	it('drives a createForm field and shows its error', async () => {
		const user = userEvent.setup({ delay: null });
		const form = createForm({
			initialValues: { minNotice: '2' },
			validators: { minNotice: [Validators.max(72)] }
		});
		renderStepper({ field: form.field('minNotice'), value: undefined });

		await user.click(increase());
		expect(form.values.minNotice).toBe('3');

		await user.clear(spinbutton());
		await user.type(spinbutton(), '80');
		await user.tab();

		expect(form.values.minNotice).toBe('80');
		expect(await screen.findByText('Value is too large')).toBeInTheDocument();
		expect(spinbutton()).toHaveAttribute('aria-invalid', 'true');
	});
});
