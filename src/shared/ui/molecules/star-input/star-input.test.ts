import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { starInputKey, toggleStar } from './index';
import Harness from './star-input.harness.svelte';

const slider = () => screen.getByRole('slider', { name: 'Σε βάθος' });
const star = (n: number) =>
	document.querySelector(`[data-slot="star-input-star"][data-star="${n}"]`) as HTMLElement;
const filled = () =>
	[...document.querySelectorAll('[data-slot="star-input-star"]')].map((node) =>
		node.getAttribute('data-filled')
	);

describe('toggleStar (U-138.2)', () => {
	it('a press gives the star whole, a second press on it half, a third whole again', () => {
		expect(toggleStar(0, 4)).toBe(8);
		expect(toggleStar(8, 4)).toBe(7);
		expect(toggleStar(7, 4)).toBe(8);
		expect(toggleStar(7, 2)).toBe(4);
		expect(toggleStar(3, 2)).toBe(4);
		expect(toggleStar(4, 1)).toBe(2);
		expect(toggleStar(2, 1)).toBe(1);
	});
});

describe('starInputKey (P-W4 Σ-11)', () => {
	it('half a star a step, Home a half, End every star; another key is the page’s', () => {
		expect(starInputKey(0, 'ArrowRight', 5)).toBe(1);
		expect(starInputKey(4, 'ArrowUp', 5)).toBe(5);
		expect(starInputKey(5, 'ArrowLeft', 5)).toBe(4);
		expect(starInputKey(5, 'ArrowDown', 5)).toBe(4);
		expect(starInputKey(6, 'Home', 5)).toBe(1);
		expect(starInputKey(0, 'End', 5)).toBe(10);
		for (const key of ['Enter', ' ', 'Tab', 'PageUp', 'a'])
			expect(starInputKey(4, key, 5)).toBeNull();
	});

	it('(negative) never past every star, never under a half once given, never down from none', () => {
		expect(starInputKey(10, 'ArrowRight', 5)).toBe(10);
		expect(starInputKey(1, 'ArrowLeft', 5)).toBe(1);
		expect(starInputKey(0, 'ArrowLeft', 5)).toBe(0);
		expect(starInputKey(0, 'ArrowDown', 5)).toBe(0);
		expect(starInputKey(6, 'End', 3)).toBe(6);
	});
});

describe('StarInput', () => {
	it('P-W4 Σ-11: ONE slider a row — its name, 0–10, the caller’s words for the value — and the stars inside it hidden from a screen reader', () => {
		render(Harness);
		const control = slider();
		expect(control).toHaveAttribute('aria-valuemin', '0');
		expect(control).toHaveAttribute('aria-valuemax', '10');
		expect(control).toHaveAttribute('aria-valuenow', '0');
		expect(control).toHaveAttribute('aria-valuetext', 'Χωρίς βαθμό');
		expect(control).toHaveAttribute('aria-orientation', 'horizontal');
		expect(control).toHaveAttribute('tabindex', '0');
		expect(screen.getAllByRole('slider')).toHaveLength(1);
		const stars = document.querySelectorAll('[data-slot="star-input-star"]');
		expect(stars).toHaveLength(5);
		for (const node of stars) {
			expect(node).toHaveAttribute('aria-hidden', 'true');
			expect(node.querySelector('[tabindex], button, a')).toBeNull();
		}
		expect(filled()).toEqual(['false', 'false', 'false', 'false', 'false']);
	});

	it('U-138.2: a press is the whole star, the same star again half, a third time whole; another star whole', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		render(Harness, { props: { onValueChange } });
		await user.click(star(4));
		expect(slider()).toHaveAttribute('aria-valuenow', '8');
		expect(slider()).toHaveAttribute('aria-valuetext', '4 στα 5');
		expect(filled()).toEqual(['true', 'true', 'true', 'true', 'false']);
		await user.click(star(4));
		expect(slider()).toHaveAttribute('aria-valuetext', '3,5 στα 5');
		expect(filled()).toEqual(['true', 'true', 'true', 'half', 'false']);
		await user.click(star(4));
		expect(slider()).toHaveAttribute('aria-valuenow', '8');
		await user.click(star(2));
		expect(slider()).toHaveAttribute('aria-valuenow', '4');
		expect(screen.getByTestId('bound')).toHaveTextContent('4');
		expect(onValueChange.mock.calls.map(([value]) => value)).toEqual([8, 7, 8, 4]);
	});

	it('U-138.2: a press anywhere in a star’s 48 box counts, the glyph and its half included', async () => {
		render(Harness, { props: { initial: 5 } });
		const half = star(3).querySelector('.overflow-hidden') as HTMLElement;
		await fireEvent.click(half.firstElementChild as Element);
		expect(slider()).toHaveAttribute('aria-valuenow', '6');
		await fireEvent.click(star(5));
		expect(slider()).toHaveAttribute('aria-valuenow', '10');
		expect(filled()).toEqual(['true', 'true', 'true', 'true', 'true']);
	});

	it('(negative) a press between the stars, outside every box, changes nothing', async () => {
		const onValueChange = vi.fn();
		render(Harness, { props: { initial: 6, onValueChange } });
		await fireEvent.click(slider());
		expect(slider()).toHaveAttribute('aria-valuenow', '6');
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('P-W4 Σ-11: the arrows move half a star, Home and End go to the ends, the screen reader hears «4,5 στα 5»', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { initial: 8 } });
		slider().focus();
		await user.keyboard('{ArrowRight}');
		expect(slider()).toHaveAttribute('aria-valuetext', '4,5 στα 5');
		await user.keyboard('{ArrowUp}{ArrowUp}');
		expect(slider()).toHaveAttribute('aria-valuenow', '10');
		await user.keyboard('{ArrowLeft}{ArrowDown}');
		expect(slider()).toHaveAttribute('aria-valuenow', '8');
		await user.keyboard('{Home}');
		expect(slider()).toHaveAttribute('aria-valuetext', '0,5 στα 5');
		await user.keyboard('{ArrowLeft}');
		expect(slider()).toHaveAttribute('aria-valuenow', '1');
		await user.keyboard('{End}');
		expect(slider()).toHaveAttribute('aria-valuetext', '5 στα 5');
		expect(screen.getByTestId('bound')).toHaveTextContent('10');
	});

	it('(negative) a key that is not the slider’s is left to the page (Tab moves on)', async () => {
		render(Harness, { props: { initial: 4 } });
		const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
		slider().dispatchEvent(enter);
		expect(enter.defaultPrevented).toBe(false);
		const right = new KeyboardEvent('keydown', {
			key: 'ArrowRight',
			bubbles: true,
			cancelable: true
		});
		slider().dispatchEvent(right);
		expect(right.defaultPrevented).toBe(true);
	});

	it('(negative) disabled: out of the Tab order, said disabled, and neither a press nor a key moves it', async () => {
		const user = userEvent.setup();
		const onValueChange = vi.fn();
		render(Harness, { props: { initial: 6, disabled: true, onValueChange } });
		expect(slider()).toHaveAttribute('tabindex', '-1');
		expect(slider()).toHaveAttribute('aria-disabled', 'true');
		await fireEvent.click(star(1));
		slider().focus();
		await user.keyboard('{ArrowRight}{End}');
		expect(slider()).toHaveAttribute('aria-valuenow', '6');
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it('the contract’s targets: the slider at least 48 × 48, each star a 48 box with the 32 glyph; the hand under the pointer, `not-allowed` disabled', () => {
		render(Harness);
		expect(slider()).toHaveClass('min-h-touch', 'min-w-touch', 'cursor-pointer');
		expect(slider()).toHaveClass('aria-disabled:cursor-not-allowed');
		for (const n of [1, 2, 3, 4, 5]) {
			expect(star(n)).toHaveClass('size-touch');
			expect(star(n).querySelector('svg')).toHaveClass('icon-xl');
		}
	});

	it('U-100, U-12: no colour under the pointer, no tap flash, no zoom on a double tap; the keyboard’s ring only', () => {
		render(Harness, { props: { initial: 7 } });
		const control = slider();
		expect(control).toHaveClass(
			'touch-manipulation',
			'[-webkit-tap-highlight-color:transparent]',
			'focus-visible:ring-3',
			'focus-visible:ring-ring/50'
		);
		const classes = [control, ...control.querySelectorAll('*')].flatMap((node) => [
			...node.classList
		]);
		expect(classes.filter((name) => name.includes('hover:'))).toEqual([]);
		expect(classes.filter((name) => /^(?:[a-z-]+:)*(?:transition|animate)/u.test(name))).toEqual(
			[]
		);
	});

	it('D-W4-27: the read-only rating’s stars — `rating` filled, `muted-foreground/24` empty, half the coloured one over the empty — no colour of its own', () => {
		render(Harness, { props: { initial: 7 } });
		expect(star(1).querySelector('svg')).toHaveClass('text-rating');
		expect(star(5).querySelector('svg')).toHaveClass('text-muted-foreground/24');
		const half = star(4);
		expect(half).toHaveAttribute('data-filled', 'half');
		const [empty, coloured] = half.querySelectorAll('svg');
		expect(empty).toHaveClass('text-muted-foreground/24');
		expect(coloured).toHaveClass('text-rating');
		expect(coloured.parentElement).toHaveClass('w-1/2', 'overflow-hidden');
		expect(document.body.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/iu);
	});
});
