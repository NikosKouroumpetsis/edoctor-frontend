import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { cubicBezierCss, motion } from '$shared/design/tokens';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import FloatingLabel from './floating-label.svelte';

const label = () => screen.getByText('Email');

describe('FloatingLabel', () => {
	// U-06.8 (3β): the application's atom, prop-driven; the classes are the ones the fields drew with CSS before.
	it('U-06.8: rests centred in the control at full size, in the muted colour', () => {
		render(FloatingLabel, { props: { label: 'Email', floated: false } });
		expect(label()).toHaveClass(
			'pointer-events-none',
			'absolute',
			'origin-left',
			// U-12.5: the application's motion, named (`labelAnimationDuration` 200, `inOut(quad)`); R2's
			// `motion-reduce:transition-none` is gone (U-12.1).
			'transition-[translate,scale,left]',
			'duration-label',
			'ease-label',
			'top-3',
			'text-body-lg',
			'translate-y-0',
			'scale-100',
			'left-2.5',
			'text-muted-foreground'
		);
		expect(label()).not.toHaveClass('scale-75');
	});

	it('U-06.8: floated it rises 75 % into the top padding; focused it takes the foreground', () => {
		render(FloatingLabel, { props: { label: 'Email', floated: true, focused: true } });
		expect(label()).toHaveClass('scale-75', '-translate-y-3', 'left-2.5', 'text-foreground');
		expect(label()).toHaveAttribute('data-floated');
	});

	it('U-06.8: the error colour wins over the focus', () => {
		render(FloatingLabel, { props: { label: 'Email', floated: true, focused: true, error: true } });
		expect(label()).toHaveClass('text-danger-text');
		expect(label()).not.toHaveClass('text-foreground');
	});

	it('U-06.8: each field size places it from the scale’s field box', () => {
		for (const [size, rest, float, left] of [
			['default', 'top-3', '-translate-y-3', 'left-2.5'],
			['lg', 'top-4', '-translate-y-4', 'left-2.5'],
			['xl', 'top-5', '-translate-y-5', 'left-3']
		] as const) {
			const view = render(FloatingLabel, { props: { label: 'Email', floated: true, size } });
			expect(label()).toHaveClass(rest, float, left);
			view.unmount();
		}
		render(FloatingLabel, { props: { label: 'Email', floated: true, size: 'xl' } });
		expect(label()).toHaveClass('text-title-sm', 'font-normal');
	});

	it('U-06.8: beside a leading icon it rests clear of it and floats back to the padding', () => {
		const resting = render(FloatingLabel, {
			props: { label: 'Email', floated: false, leading: true }
		});
		expect(label()).toHaveClass('left-field-inset');
		resting.unmount();
		render(FloatingLabel, { props: { label: 'Email', floated: true, leading: true } });
		expect(label()).toHaveClass('left-2.5');
		expect(label()).not.toHaveClass('left-field-inset');
	});

	// R3-3: the label must never rest over a value the browser autofilled before any script saw it.
	it('R3-3: resting, an autofilled input (its `peer`) floats it by CSS', () => {
		render(FloatingLabel, { props: { label: 'Email', floated: false } });
		expect(label()).toHaveClass(
			'peer-autofill:-translate-y-3',
			'peer-autofill:scale-75',
			'peer-autofill:left-2.5'
		);
	});

	it('U-06.8: inside the bordered box both places shed the 1px border; `for` names the control', () => {
		render(FloatingLabel, {
			props: { label: 'Email', floated: true, insideBorder: true, for: 'email' }
		});
		expect(label()).toHaveClass('-mt-px');
		expect(label()).toHaveAttribute('for', 'email');
		expect(label().tagName).toBe('LABEL');
	});

	// R2 wrote `duration-label` with no transition property: CSS's initial `all` then moved the colour too, and
	// `motion-reduce:transition-none` stopped all of it on the owner's Mac (U-12, «0 animation» on every float label).
	it('U-12.5: the application’s motion — the move and the 75 % scale, 200 ms `inOut(quad)`; the colour does not move', () => {
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/atoms/floating-label/index.tsx'),
			'utf8'
		);
		expect(/const labelAnimationDuration = (\d+);/.exec(app)?.[1]).toBe(
			String(motion.duration.label)
		);
		expect(/const FLOAT_SCALE = ([\d.]+);/.exec(app)?.[1]).toBe('0.75');
		expect(cubicBezierCss('label')).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
		render(FloatingLabel, { props: { label: 'Email', floated: false } });
		const classes = label().getAttribute('class') ?? '';
		expect(label()).toHaveClass(
			'transition-[translate,scale,left]',
			'duration-label',
			'ease-label'
		);
		// One transition property list, and no colour in it (no `transition`, `transition-all`, `transition-colors`).
		expect(classes.match(/(^|\s)transition(-[^\s]+)?(?=\s|$)/g)).toEqual([
			' transition-[translate,scale,left]'
		]);
		expect(classes).not.toMatch(/motion-(reduce|safe):/);
	});

	it('U-12.5: the SAME label element rests and floats — its classes change, so the CSS transition runs', async () => {
		const view = render(FloatingLabel, { props: { label: 'Email', floated: false } });
		const node = label();
		await view.rerender({ label: 'Email', floated: true, focused: true });
		expect(label()).toBe(node);
		expect(node).toHaveClass('scale-75', '-translate-y-3');
		await view.rerender({ label: 'Email', floated: false });
		expect(label()).toBe(node);
		expect(node).toHaveClass('scale-100', 'translate-y-0');
	});

	it('U-12.1 (negative): under reduced motion the label keeps its whole motion', () => {
		reduceMotion();
		render(FloatingLabel, { props: { label: 'Email', floated: true } });
		expect(label()).toHaveClass(
			'transition-[translate,scale,left]',
			'duration-label',
			'ease-label'
		);
		expect(label().getAttribute('class')).not.toMatch(/motion-(reduce|safe):/);
	});
});
