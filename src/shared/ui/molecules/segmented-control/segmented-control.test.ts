import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { cubicBezier, cubicBezierCss, motion } from '$shared/design/tokens';
import userEvent from '@testing-library/user-event';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import SegmentedControl from './segmented-control.svelte';

const segments = [
	{ label: 'Όλοι', value: 'any' },
	{ label: 'Γυναίκα', value: 'female' },
	{ label: 'Άνδρας', value: 'male' }
];
const thumbOf = () => screen.getByTestId('gender-thumb');

describe('SegmentedControl', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1 (K4.x, D8): the 1px track, equal 48 segments, the 13 medium words — the chosen in the text colour', () => {
		render(SegmentedControl, {
			props: { segments, value: 'female', 'aria-label': 'Φύλο', testId: 'gender' }
		});
		const group = screen.getByRole('radiogroup', { name: 'Φύλο' });
		expect(group).toHaveClass('w-full', 'rounded-md', 'border', 'border-border', 'p-1');
		expect(group).toHaveAttribute('data-testid', 'gender');
		const female = screen.getByRole('radio', { name: 'Γυναίκα' });
		expect(female).toHaveClass(
			'relative',
			'min-h-touch',
			'min-w-touch',
			'flex-1',
			'items-center',
			'justify-center',
			'rounded-md',
			'px-3',
			'py-2'
		);
		expect(female).toHaveAttribute('aria-checked', 'true');
		expect(female).toHaveAttribute('data-testid', 'gender-female');
		expect(screen.getByText('Γυναίκα')).toHaveClass(
			'text-center',
			'text-label-lg',
			'font-medium',
			'text-foreground'
		);
		expect(screen.getByText('Όλοι')).toHaveClass('text-muted-foreground');
	});

	// U-09.1 named the motion: `duration-segment` (180, the application's `THUMB_SLIDE_DURATION_MS`) on its
	// `out(cubic)` curve, where the thumb had `duration-180 ease-out` (Tailwind's curve, not the application's).
	it('U-03.1 (D8): one dark-ringed muted thumb, a third wide, on the chosen segment; it slides 180 ms', () => {
		render(SegmentedControl, { props: { segments, value: 'male', testId: 'gender' } });
		expect(thumbOf()).toHaveClass(
			'absolute',
			'inset-y-0',
			'left-0',
			'rounded-md',
			'border-2',
			'border-foreground',
			'bg-muted',
			'transition-transform',
			'duration-segment',
			'ease-segment'
		);
		expect(thumbOf().style.width).toMatch(/^33\.33/);
		expect(thumbOf().style.transform).toBe('translateX(200%)');
	});

	it('U-03.1 (D8): a hairline only between two unselected segments, never beside the thumb', () => {
		const first = render(SegmentedControl, { props: { segments, value: 'any', testId: 'gender' } });
		expect(screen.queryByTestId('gender-divider-1')).toBeNull();
		expect(screen.getByTestId('gender-divider-2')).toHaveClass(
			'absolute',
			'inset-y-2',
			'left-0',
			'w-px',
			'bg-border'
		);
		first.unmount();
		render(SegmentedControl, { props: { segments, value: 'female', testId: 'gender' } });
		expect(screen.queryByTestId('gender-divider-1')).toBeNull();
		expect(screen.queryByTestId('gender-divider-2')).toBeNull();
	});

	it('U-03.1 (a11y): a press and the arrows choose (radio group, one Tab stop); `onChange` gets the value', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(SegmentedControl, { props: { segments, value: 'any', onChange, testId: 'gender' } });
		const any = screen.getByRole('radio', { name: 'Όλοι' });
		expect(any).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('radio', { name: 'Άνδρας' })).toHaveAttribute('tabindex', '-1');
		await user.click(screen.getByRole('radio', { name: 'Άνδρας' }));
		expect(onChange).toHaveBeenLastCalledWith('male');
		expect(thumbOf().style.transform).toBe('translateX(200%)');
		await user.keyboard('{ArrowRight}');
		expect(onChange).toHaveBeenLastCalledWith('any');
		expect(any).toHaveFocus();
		expect(any).toHaveAttribute('aria-checked', 'true');
	});

	it('U-03.1 (negative): disabled ⇒ dimmed and refused; an unknown value leaves the thumb on the first, none chosen', async () => {
		const onChange = vi.fn();
		const view = render(SegmentedControl, {
			props: { segments, value: 'female', disabled: true, onChange, testId: 'gender' }
		});
		expect(screen.getByRole('radiogroup')).toHaveClass('opacity-50');
		await userEvent.setup({ delay: null }).click(screen.getByRole('radio', { name: 'Άνδρας' }));
		expect(onChange).not.toHaveBeenCalled();
		view.unmount();
		render(SegmentedControl, { props: { segments, value: 'other', testId: 'gender' } });
		expect(thumbOf().style.transform).toBe('translateX(0%)');
		for (const radio of screen.getAllByRole('radio'))
			expect(radio).toHaveAttribute('aria-checked', 'false');
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(SegmentedControl, { props: { segments, value: 'any' } });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});

	it('U-09.1: the thumb slides by `transform` with a transition on the application’s 180 ms `out(cubic)`', async () => {
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/molecules/segmented-control/index.tsx'),
			'utf8'
		);
		expect(/const THUMB_SLIDE_DURATION_MS = (\d+);/.exec(app)?.[1]).toBe(
			String(motion.duration.segment)
		);
		expect(app).toContain('easing: Easing.out(Easing.cubic)');
		expect(cubicBezierCss('segment')).toBe('cubic-bezier(0.33, 1, 0.68, 1)');
		// The CSS curve is the application's `Easing.out(Easing.cubic)`.
		const bezier = cubicBezier(...motion.easing.segment);
		for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
			expect(Math.abs(bezier(t) - (1 - (1 - t) ** 3))).toBeLessThan(0.03);
		}
		const user = userEvent.setup();
		render(SegmentedControl, { props: { segments, value: 'male', testId: 'gender' } });
		const thumb = thumbOf();
		expect(thumb.style.transform).toBe('translateX(200%)');
		await user.click(screen.getByRole('radio', { name: 'Όλοι' }));
		// The same element moves (no new thumb): its transform changes and the CSS transition carries it.
		expect(thumbOf()).toBe(thumb);
		expect(thumb.style.transform).toBe('translateX(0%)');
	});

	it('U-09.1: the first draw is already in place — no slide from the start (the server draws it there too)', () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const target = document.body.appendChild(document.createElement('div'));
		const app = mount(SegmentedControl, {
			target,
			props: { segments, value: 'male', testId: 'gender' }
		});
		// Before any effect runs (the markup as the server sends it), the thumb is already on the third segment.
		expect(
			target.querySelector<HTMLElement>('[data-slot="segmented-control-thumb"]')?.style.transform
		).toBe('translateX(200%)');
		flushSync();
		expect(animate).not.toHaveBeenCalled();
		unmount(app);
		target.remove();
	});

	// Rewritten from U-09.1 / U-09.13 (R2's `motion-reduce:transition-none` on the thumb hid the slide on the
	// owner's Mac, U-11.2): the thumb slides whatever the motion setting (U-12.1, U-12.6).
	it('U-12.6 (negative): under reduced motion the same thumb slides, on the same transition', async () => {
		reduceMotion();
		const user = userEvent.setup();
		render(SegmentedControl, { props: { segments, value: 'male', testId: 'gender' } });
		const thumb = thumbOf();
		expect(thumb).toHaveClass('transition-transform', 'duration-segment', 'ease-segment');
		expect(thumb.getAttribute('class')).not.toMatch(/motion-(reduce|safe):/);
		await user.click(screen.getByRole('radio', { name: 'Όλοι' }));
		expect(thumbOf()).toBe(thumb);
		expect(thumb.style.transform).toBe('translateX(0%)');
	});
});
