import { afterEach, describe, expect, it } from 'vitest';
import { keepArrowFocus } from './arrow-focus';

function mountArrows() {
	const previous = document.createElement('button');
	const next = document.createElement('button');
	const other = document.createElement('button');
	document.body.append(previous, next, other);
	return { previous, next, other };
}

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('keepArrowFocus', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('U-03.1 (NIT-4 of dyad 3): at the end, the focus on the arrow that turns off moves to the other one', async () => {
		const { previous, next } = mountArrows();
		next.focus();
		keepArrowFocus({ previous, next }, { previous: true, next: false });
		await settle();
		expect(previous).toHaveFocus();
		keepArrowFocus({ previous, next }, { previous: false, next: true });
		await settle();
		expect(next).toHaveFocus();
	});

	it('U-03.1 (NIT-4): the other arrow may turn on in the same update — the move waits for the DOM (a two-page rail)', async () => {
		const { previous, next } = mountArrows();
		next.focus();
		previous.disabled = true;
		keepArrowFocus({ previous, next }, { previous: true, next: false });
		// The DOM catches up after the pre-update read: «previous» is enabled again before the focus moves.
		previous.disabled = false;
		next.disabled = true;
		await settle();
		expect(previous).toHaveFocus();
	});

	it('leaves the focus alone elsewhere, while the arrow can still move, or when both turn off', async () => {
		const { previous, next, other } = mountArrows();
		other.focus();
		keepArrowFocus({ previous, next }, { previous: true, next: false });
		await settle();
		expect(other).toHaveFocus();
		next.focus();
		keepArrowFocus({ previous, next }, { previous: true, next: true });
		keepArrowFocus({ previous, next }, { previous: false, next: false });
		keepArrowFocus({ previous: null, next: null }, { previous: false, next: false });
		await settle();
		expect(next).toHaveFocus();
	});
});
