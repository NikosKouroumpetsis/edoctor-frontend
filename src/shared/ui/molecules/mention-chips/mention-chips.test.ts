import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { MentionChips, type MentionChip, type MentionChipsProps } from './index';

const chips: MentionChip[] = [
	{ id: 'a', label: 'Ευγένεια', count: '53', icon: 'heart-outline' },
	{ id: 'b', label: 'Οργάνωση', count: '1.234', icon: 'calendar-outline' }
];

function setup(overrides: Partial<MentionChipsProps> = {}) {
	const onChange = vi.fn();
	const view = render(MentionChips, {
		props: {
			title: 'Οι ασθενείς αναφέρουν',
			chips,
			value: null,
			onChange,
			clearLabel: 'Καθαρισμός',
			testId: 'mentions',
			...overrides
		}
	});
	return { onChange, ...view };
}

/** jsdom lays out nothing: the row's box (100…400), the chosen chip's, and the row's own scroll, recorded. */
function measuredRow(chosen: { left: number; right: number }) {
	const scrollBy = vi.fn();
	Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
		value: scrollBy,
		configurable: true,
		writable: true
	});
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		const box = this.dataset.testid === 'mentions-row' ? { left: 100, right: 400 } : chosen;
		return box as DOMRect;
	});
	return scrollBy;
}

describe('MentionChips', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		Reflect.deleteProperty(HTMLElement.prototype, 'scrollBy');
	});

	it('U-66.2: a heading and one group of toggles, each with its glyph, words and count', () => {
		setup();
		const section = screen.getByRole('region', { name: 'Οι ασθενείς αναφέρουν' });
		expect(within(section).getByRole('heading', { level: 3 })).toHaveTextContent(
			'Οι ασθενείς αναφέρουν'
		);
		const group = within(section).getByRole('group', { name: 'Οι ασθενείς αναφέρουν' });
		const toggles = within(group).getAllByRole('button');
		expect(toggles).toHaveLength(2);
		expect(toggles[0]).toHaveAttribute('aria-pressed', 'false');
		expect(toggles[0]).toHaveTextContent('Ευγένεια');
		expect(toggles[1].querySelector('[data-slot="mention-chip-count"]')).toHaveTextContent('1.234');
		expect(toggles[0].querySelector('svg')).not.toBeNull();
		expect(screen.queryByTestId('mentions-clear')).toBeNull();
	});

	it('U-66.2: nothing without chips', () => {
		const { container } = setup({ chips: [] });
		expect(container.querySelector('[data-slot="mention-chips"]')).toBeNull();
	});

	it('U-66.2: «Καθαρισμός» comes beside the heading only for a chip that is there, and the row stays 48', async () => {
		const { rerender, container } = setup();
		const head = container.querySelector('[data-slot="mention-chips-head"]') as HTMLElement;
		expect(head).toHaveClass('min-h-touch', 'justify-between');
		expect(within(head).queryByTestId('mentions-clear')).toBeNull();
		await rerender({ value: 'a' });
		const clear = within(head).getByTestId('mentions-clear');
		expect(clear).toHaveTextContent('Καθαρισμός');
		expect(clear.className).not.toContain('-m');
		await rerender({ value: 'nothing-like-it' });
		expect(screen.queryByTestId('mentions-clear')).toBeNull();
		expect(screen.getByTestId('mentions-chip-a')).toHaveAttribute('aria-pressed', 'false');
	});

	it('U-66.2: a chip takes the words a reader hears', () => {
		setup({
			chips: [{ ...chips[0], ariaLabel: 'Ευγένεια, 53 κριτικές' }]
		});
		expect(screen.getByRole('button', { name: 'Ευγένεια, 53 κριτικές' })).toHaveTextContent(
			'Ευγένεια'
		);
	});

	it('U-66.2: a press chooses the topic, a second press takes it out, and so does «Καθαρισμός»', async () => {
		const { onChange, rerender } = setup();
		await fireEvent.click(screen.getByTestId('mentions-chip-a'));
		expect(onChange).toHaveBeenLastCalledWith('a');

		await rerender({ value: 'a' });
		expect(screen.getByTestId('mentions-chip-a')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('mentions-chip-b')).toHaveAttribute('aria-pressed', 'false');
		await fireEvent.click(screen.getByTestId('mentions-chip-a'));
		expect(onChange).toHaveBeenLastCalledWith(null);

		onChange.mockClear();
		await fireEvent.click(screen.getByTestId('mentions-chip-b'));
		expect(onChange).toHaveBeenLastCalledWith('b');

		onChange.mockClear();
		await fireEvent.click(screen.getByTestId('mentions-clear'));
		expect(onChange).toHaveBeenLastCalledWith(null);
	});

	it('U-81.2: below 744 the application’s chip, from 744 Airbnb’s: every press target at least 48', () => {
		setup({ value: 'a' });
		const chip = screen.getByTestId('mentions-chip-b');
		expect(chip).toHaveClass('min-h-touch', 'rounded-lg', 'text-body-md', 'border-border');
		expect(chip).toHaveClass(
			'tablet:min-h-control-lg',
			'tablet:rounded-md',
			'tablet:text-label-md',
			'tablet:shadow-raised'
		);
		expect(screen.getByTestId('mentions-clear')).toHaveClass('min-h-touch');
	});

	it('U-66.1 Π5: the chosen chip has the dark ring and the coloured glyph; the other keeps its border', () => {
		setup({ value: 'a' });
		const chosen = screen.getByTestId('mentions-chip-a');
		expect(chosen).toHaveClass('border-foreground', 'ring-1', 'ring-foreground');
		expect(chosen.querySelector('svg')).toHaveClass('text-rating');
		const other = screen.getByTestId('mentions-chip-b');
		expect(other).not.toHaveClass('border-foreground');
		expect(other.querySelector('svg')).toHaveClass('text-foreground');
	});

	it('U-60.4: the chosen chip comes into view, moving only the row', () => {
		const scrollBy = measuredRow({ left: 380, right: 520 });
		setup({ value: 'b' });
		expect(scrollBy).toHaveBeenCalledWith({ left: 240, behavior: 'smooth' });
	});

	it('U-60.4: a chip already in view does not move the row', () => {
		const scrollBy = measuredRow({ left: 200, right: 300 });
		setup({ value: 'b' });
		expect(scrollBy).not.toHaveBeenCalled();
	});

	it('U-65.6 (negative): the words stay text: an HTML label draws no element', () => {
		const { container } = setup({
			chips: [{ id: 'x', label: '<img src=x onerror=alert(1)>', count: '2', icon: 'heart-outline' }]
		});
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByTestId('mentions-chip-x')).toHaveTextContent('<img src=x onerror=alert(1)>');
	});

	it('Π5: from 744 the arrows name themselves, and show only with more of the row to see', async () => {
		setup({ scrollLabels: { previous: 'Πίσω', next: 'Μπροστά' } });
		const row = screen.getByTestId('mentions-row');
		const next = screen.getByRole('button', { name: 'Μπροστά', hidden: true });
		const previous = screen.getByRole('button', { name: 'Πίσω', hidden: true });
		expect(next).toBeDisabled();
		expect(previous).toBeDisabled();
		expect(next).toHaveClass('hidden', 'tablet:inline-flex', 'opacity-0');
		Object.defineProperty(row, 'scrollWidth', { value: 900, configurable: true });
		Object.defineProperty(row, 'clientWidth', { value: 300, configurable: true });
		await fireEvent.scroll(row);
		expect(next).toBeEnabled();
		expect(next).not.toHaveClass('opacity-0');
		expect(previous).toBeDisabled();
	});
});
