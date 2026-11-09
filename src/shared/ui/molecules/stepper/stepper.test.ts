import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createForm, Validators } from '$shared/lib/form';
import Stepper from './stepper.svelte';

const TITLE = 'Ελάχιστος χρόνος πριν την κράτηση (ώρες)';
const HELP = 'Πόσες ώρες πριν σταματά η κράτηση για μια ώρα (0-72).';

// The names come from the caller, already in the page's language (U-03.5: no catalog of its own).
const GREEK = { decreaseLabel: 'Μείωση', increaseLabel: 'Αύξηση', emptyValueLabel: 'Κενό' };
const ENGLISH = { decreaseLabel: 'Decrease', increaseLabel: 'Increase', emptyValueLabel: 'Empty' };

function renderStepper(props: Record<string, unknown> = {}) {
	return render(Stepper, {
		props: { label: TITLE, helperText: HELP, min: 0, max: 72, value: '2', ...GREEK, ...props }
	});
}

const spinbutton = () => screen.getByRole('spinbutton');
const decrease = () => screen.getByRole('button', { name: 'Μείωση' });
const increase = () => screen.getByRole('button', { name: 'Αύξηση' });

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
		const greek = renderStepper();

		for (const button of [decrease(), increase()]) expect(button).toHaveClass('size-touch');
		expect(screen.queryByRole('button', { name: 'Decrease' })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Increase' })).not.toBeInTheDocument();
		greek.unmount();

		renderStepper(ENGLISH);

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

		const english = renderStepper({ value: '', ...ENGLISH });
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
		expect(spinbutton().parentElement).toHaveClass('border-danger');
		expect(screen.getByText('Από 0 έως 72')).toHaveClass('text-danger-text');
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

	// The office's floor (record §6.8 «Πώς θα σας βρουν»): −1…20, «Υπόγειο / Ισόγειο / 1ος … 20ος», the bound's button off.
	const floorName = (n: number) => (n < 0 ? 'Υπόγειο' : n === 0 ? 'Ισόγειο' : `${n}ος`);

	it('P-A3 Σ14 / U-81.2: `valueLabel` shows and says the words, not the number — read-only, moved by «−» / «+» and the arrows', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({
			label: 'Όροφος',
			helperText: undefined,
			min: -1,
			max: 20,
			value: '0',
			valueLabel: floorName
		});

		expect(spinbutton()).toHaveValue('Ισόγειο');
		expect(spinbutton()).toHaveAttribute('readonly');
		expect(spinbutton()).toHaveAttribute('aria-valuetext', 'Ισόγειο');
		expect(spinbutton()).toHaveAttribute('aria-valuenow', '0');
		await user.click(increase());
		await user.click(increase());
		await user.click(increase());
		expect(spinbutton()).toHaveValue('3ος');
		expect(spinbutton()).toHaveAttribute('aria-valuetext', '3ος');
		expect(spinbutton()).toHaveAttribute('aria-valuenow', '3');
		spinbutton().focus();
		await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
		expect(spinbutton()).toHaveValue('Υπόγειο');
		expect(decrease()).toBeDisabled();
		expect(increase()).toBeEnabled();
	});

	it('P-A3 Σ14 (negative): with `valueLabel` typing changes nothing — not letters, not digits, not a pasted script', async () => {
		const user = userEvent.setup({ delay: null });
		const form = createForm({ initialValues: { floor: '2' } });
		renderStepper({
			label: 'Όροφος',
			min: -1,
			max: 20,
			field: form.field('floor'),
			value: undefined,
			valueLabel: floorName
		});

		await user.type(spinbutton(), '15<script>');
		expect(form.values.floor).toBe('2');
		expect(spinbutton()).toHaveValue('2ος');
		await user.click(increase());
		expect(form.values.floor).toBe('3');
		// At the top bound «+» is off and the number stays inside it.
		form.field('floor').setValue('20');
		await user.click(increase());
		expect(form.values.floor).toBe('20');
		expect(increase()).toBeDisabled();
	});

	it('P-A3 Σ14 (negative): without `valueLabel` the stepper is as before — the number shown and typed', async () => {
		const user = userEvent.setup({ delay: null });
		renderStepper({ value: '' });
		expect(spinbutton()).not.toHaveAttribute('readonly');
		expect(spinbutton()).toHaveAttribute('aria-valuetext', 'Κενό');
		await user.type(spinbutton(), '7');
		expect(spinbutton()).toHaveValue('7');
	});
	it('U-28.4: «−» / «+» take the light fill under the pointer (the default); U-100 / D-W3-27: `hover={false}` never — the buttons otherwise the same', () => {
		const buttons = () => [screen.getByLabelText('Μείωση'), screen.getByLabelText('Αύξηση')];
		const withHover = renderStepper({ value: '3' });
		for (const button of buttons())
			expect(button).toHaveClass('can-hover:enabled:hover:bg-foreground/5');
		const kept = buttons().map((button) =>
			[...button.classList].filter((name) => !name.includes('hover:'))
		);
		withHover.unmount();
		renderStepper({ value: '3', hover: false });
		expect(buttons().map((button) => [...button.classList])).toEqual(kept);
	});

	it('W8-Δ4: `counter` (Airbnb’s counters) — ONE 64 box with the title inside on the left (16), «−» value «+» on the right: circles of 36 on a muted line inside their 48 targets, the value 16/500 at least 64 wide', () => {
		renderStepper({
			label: 'Όροφος',
			helperText: undefined,
			min: -1,
			max: 20,
			value: '3',
			valueLabel: floorName,
			variant: 'counter',
			hover: false
		});
		const root = document.querySelector('[data-slot="stepper"]') as HTMLElement;
		const box = document.querySelector('[data-slot="stepper-box"]') as HTMLElement;
		const title = screen.getByText('Όροφος');
		expect(root).toHaveAttribute('data-variant', 'counter');
		expect(box).toHaveClass(
			'min-h-control-xl',
			'rounded-md',
			'border',
			'border-input',
			'pl-3.5',
			'pr-1'
		);
		// W8 Delta 3 (N2): 64 WITH the border, as `doctor.css` (border-box): 48 + 2 × 6 + 2 × 1 = 62 stays under the
		// 64, so the box is 64 and a circle sits 7 + 6 = 13 inside it, as the prototype's 36 in its 64 ((64 − 2 − 36) / 2).
		expect(box).toHaveClass('py-1.5');
		expect(box).not.toHaveClass('py-2');
		expect(box.firstElementChild).toBe(title);
		expect(title.tagName).toBe('LABEL');
		expect(title).toHaveClass('flex-1', 'text-body-lg', 'text-foreground');
		expect(screen.getByLabelText('Όροφος')).toBe(spinbutton());
		const controls = document.querySelector('[data-slot="stepper-controls"]') as HTMLElement;
		expect(Array.from(controls.children)).toEqual([decrease(), spinbutton(), increase()]);
		// W8 Delta 2 (NIT-5): a value too long for the box shrinks the title, then itself to 64 — never past the box.
		expect(controls).toHaveClass('min-w-0');
		expect(controls).not.toHaveClass('shrink-0');
		expect(spinbutton()).toHaveClass(
			'min-w-control-xl',
			'text-body-lg',
			'font-medium',
			'text-center'
		);
		expect(spinbutton()).toHaveValue('3ος');
		for (const button of [decrease(), increase()]) {
			expect(button).toHaveClass('size-touch', 'rounded-full', 'disabled:opacity-30');
			const round = button.querySelector('[data-slot="stepper-round"]');
			expect(round).toHaveClass('absolute', 'inset-1.5', 'rounded-full', 'border-muted-foreground');
			expect(round).toHaveAttribute('aria-hidden', 'true');
			expect([...button.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
	});

	it('W8-Δ4 (negative): `counter` keeps the stepper’s behaviour — the bounds lock their circle, the arrows move it, typing changes nothing; the default stays S-26.4’s, with no circle', async () => {
		const user = userEvent.setup({ delay: null });
		const counter = renderStepper({
			label: 'Όροφος',
			helperText: undefined,
			min: -1,
			max: 20,
			value: '19',
			valueLabel: floorName,
			variant: 'counter'
		});
		await user.click(increase());
		expect(spinbutton()).toHaveValue('20ος');
		expect(increase()).toBeDisabled();
		await user.type(spinbutton(), '5<b>');
		expect(spinbutton()).toHaveValue('20ος');
		spinbutton().focus();
		for (let step = 0; step < 21; step += 1) await user.keyboard('{ArrowDown}');
		expect(spinbutton()).toHaveValue('Υπόγειο');
		expect(decrease()).toBeDisabled();
		counter.unmount();

		renderStepper();
		expect(document.querySelector('[data-slot="stepper-round"]')).toBeNull();
		expect(document.querySelector('[data-slot="stepper-controls"]')).toBeNull();
		expect(document.querySelector('[data-slot="stepper"]')).toHaveAttribute(
			'data-variant',
			'default'
		);
		expect(decrease()).not.toHaveClass('rounded-full');
	});
});
