import { afterEach, describe, expect, it, vi } from 'vitest';
import { tick, type ComponentProps } from 'svelte';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { controls, media } from '$shared/design/tokens';
import DateStrip from './date-strip.svelte';
import Harness from './date-strip.harness.svelte';
import { toDayCardWidth, type DateStripDay } from './index';

const DAYS: DateStripDay[] = [
	{ accessibleLabel: 'Τετ 29 Ιουλ', label: 'Τετ 29', sublabel: 'Ιουλ', value: '2026-07-29' },
	{ accessibleLabel: 'Πέμ 30 Ιουλ', label: 'Πέμ 30', sublabel: 'Ιουλ', value: '2026-07-30' },
	{
		accessibleLabel: 'Παρ 31 Ιουλ',
		disabled: true,
		label: 'Παρ 31',
		sublabel: 'Ιουλ',
		value: '2026-07-31'
	},
	{ accessibleLabel: 'Σάβ 1 Αυγ', label: 'Σάβ 1', sublabel: 'Αυγ', value: '2026-08-01' }
];
const PREFIX = 'days';
const SCROLL_LABELS = { previous: 'Προηγούμενες ημέρες', next: 'Επόμενες ημέρες' };

const card = (value: string) => screen.getByTestId(`${PREFIX}-${value}`);
const strip = () => screen.getByTestId(`${PREFIX}-strip`);

function renderStrip(props: Record<string, unknown> = {}) {
	const onChange = vi.fn();
	const view = render(DateStrip, {
		props: {
			days: DAYS,
			value: DAYS[0].value,
			icon: 'calendar-outline',
			onChange,
			testIdPrefix: PREFIX,
			'aria-label': 'Ημέρες',
			...props
		}
	});
	return { onChange, ...view };
}

/** jsdom has no layout: give the strip a width, a content width and a position, then let it scroll. */
async function layout(
	element: HTMLElement,
	{
		width = 354,
		scrollLeft = 0,
		scrollWidth = 900
	}: { width?: number; scrollLeft?: number; scrollWidth?: number } = {}
) {
	Object.defineProperty(element, 'clientWidth', { configurable: true, value: width });
	Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
	Object.defineProperty(element, 'scrollLeft', { configurable: true, value: scrollLeft });
	await fireEvent.scroll(element);
}

describe('DateStrip', () => {
	afterEach(() => vi.restoreAllMocks());

	it('S-26.1: draws every day in ONE sideways row, each a button named by its whole date', () => {
		renderStrip();
		expect(strip()).toHaveClass('overflow-x-auto', 'min-w-0', 'flex-1');
		expect(screen.getByRole('group', { name: 'Ημέρες' })).toBe(screen.getByTestId(`${PREFIX}-row`));
		expect(
			screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
		).toEqual(DAYS.map((day) => day.accessibleLabel));
		expect(within(card('2026-07-31')).getByText('Παρ 31')).toBeInTheDocument();
		expect(within(card('2026-07-31')).getByText('Ιουλ')).toBeInTheDocument();
		expect(screen.queryByText('Παρ 31 Ιουλ')).toBeNull();
	});

	it('S-26.1: marks exactly the selected day, and a press selects another ONCE (bound value too)', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange } = renderStrip({ value: DAYS[1].value });
		const pressed = screen
			.getAllByRole('button')
			.filter((button) => button.getAttribute('aria-pressed') === 'true');
		expect(pressed).toEqual([card('2026-07-30')]);
		await user.click(card('2026-08-01'));
		expect(onChange.mock.calls).toEqual([['2026-08-01']]);
		expect(card('2026-08-01')).toHaveAttribute('aria-pressed', 'true');
		expect(card('2026-07-30')).toHaveAttribute('aria-pressed', 'false');
	});

	it('S-26.1 (negative): a closed day stays in the row, dimmed and disabled; a press on it calls nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange } = renderStrip();
		const closed = card('2026-07-31');
		expect(closed).toBeDisabled();
		expect(closed).toHaveClass('opacity-40');
		expect(card('2026-07-30')).not.toHaveClass('opacity-40');
		await user.click(closed);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('S-26.1: scrolling never selects; once measured a card is toDayCardWidth wide (its OWN width, never the screen)', async () => {
		const { onChange } = renderStrip();
		expect(card('2026-07-29').style.minWidth).toBe('');
		await layout(strip(), { width: 354, scrollLeft: 300 });
		expect(onChange).not.toHaveBeenCalled();
		expect(card('2026-07-29').style.minWidth).toBe(`${toDayCardWidth(354)}px`);
		expect(card('2026-07-31').style.minWidth).toBe(`${toDayCardWidth(354)}px`);
	});

	it('S-26.1: opens on the selected day once its width is known, without motion, and never again', async () => {
		renderStrip({ value: DAYS[3].value });
		const scrollTo = vi.fn();
		strip().scrollTo = scrollTo;
		Object.defineProperty(card('2026-08-01'), 'offsetLeft', { configurable: true, value: 240 });
		await layout(strip());
		expect(scrollTo.mock.calls).toEqual([[{ left: 240, behavior: 'instant' }]]);
		await layout(strip(), { width: 402 });
		await fireEvent.click(card('2026-07-30'));
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});

	it('S-26.1: days that arrive after the measure still open on the selected day, once', async () => {
		vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			return this.dataset.value === '2026-08-01' ? 240 : 0;
		});
		const view = renderStrip({ days: [], value: DAYS[3].value });
		const scrollTo = vi.fn();
		strip().scrollTo = scrollTo;
		await layout(strip());
		expect(scrollTo).not.toHaveBeenCalled();
		await view.rerender({ days: DAYS, value: DAYS[3].value });
		expect(scrollTo.mock.calls).toEqual([[{ left: 240, behavior: 'instant' }]]);
		await layout(strip(), { width: 402 });
		await view.rerender({ days: [...DAYS], value: DAYS[1].value });
		expect(scrollTo).toHaveBeenCalledTimes(1);
	});

	it('S-26.1 (NIT-R2-2): days pushed into the SAME list after the measure still open on the selected day, once', async () => {
		vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			return this.dataset.value === '2026-08-01' ? 240 : 0;
		});
		const view = render(Harness, { props: { value: DAYS[3].value } });
		const scrollTo = vi.fn();
		strip().scrollTo = scrollTo;
		await layout(strip());
		expect(scrollTo).not.toHaveBeenCalled();
		view.component.arrive(DAYS.slice(0, 2));
		await tick();
		expect(scrollTo).not.toHaveBeenCalled();
		view.component.arrive(DAYS.slice(2));
		await tick();
		expect(scrollTo.mock.calls).toEqual([[{ left: 240, behavior: 'instant' }]]);
	});

	it('S-26.1 (negative): a press before the width is known ends the opening for good', async () => {
		renderStrip({ value: DAYS[3].value });
		const scrollTo = vi.fn();
		strip().scrollTo = scrollTo;
		await fireEvent.click(card('2026-07-30'));
		await layout(strip());
		expect(scrollTo).not.toHaveBeenCalled();
	});

	it('S-26.1: whole cards plus a part of the next, never under day-card-min-w (the application’s formula)', () => {
		const gap = controls['touch-gap'];
		for (const width of [272, 327, 354, 402, 752]) {
			const cardWidth = toDayCardWidth(width);
			const whole = Math.floor((width + gap) / (cardWidth + gap));
			const share = (width - whole * (cardWidth + gap)) / cardWidth;
			expect(cardWidth).toBeGreaterThanOrEqual(media['day-card-min-w']);
			expect(share).toBeGreaterThanOrEqual(0.3);
			expect(share).toBeLessThanOrEqual(0.7);
		}
		expect(toDayCardWidth(0)).toBe(media['day-card-min-w']);
	});

	it('U-03.1 (a11y): one Tab stop on the selected day; the arrows, Home and End only move the focus, over the open days', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange } = renderStrip({ value: DAYS[1].value });
		expect(card('2026-07-30')).toHaveAttribute('tabindex', '0');
		for (const value of ['2026-07-29', '2026-07-31', '2026-08-01'])
			expect(card(value)).toHaveAttribute('tabindex', '-1');
		await user.tab();
		expect(card('2026-07-30')).toHaveFocus();
		await user.keyboard('{ArrowRight}');
		expect(card('2026-08-01')).toHaveFocus();
		await user.keyboard('{ArrowRight}');
		expect(card('2026-08-01')).toHaveFocus();
		await user.keyboard('{Home}');
		expect(card('2026-07-29')).toHaveFocus();
		await user.keyboard('{End}');
		expect(card('2026-08-01')).toHaveFocus();
		expect(onChange).not.toHaveBeenCalled();
		expect(card('2026-07-30')).toHaveAttribute('aria-pressed', 'true');
		await user.keyboard('{Enter}');
		expect(onChange.mock.calls).toEqual([['2026-08-01']]);
	});

	it('U-03.1 (negative): a closed or unknown selected day leaves the Tab stop on the first open day', () => {
		const first = renderStrip({ value: '2026-07-31' });
		expect(card('2026-07-29')).toHaveAttribute('tabindex', '0');
		expect(card('2026-07-31')).toHaveAttribute('tabindex', '-1');
		first.unmount();
		renderStrip({ value: '2030-01-01' });
		expect(card('2026-07-29')).toHaveAttribute('tabindex', '0');
		for (const button of screen.getAllByRole('button'))
			expect(button).toHaveAttribute('aria-pressed', 'false');
	});

	it('U-03.1 (zones): no arrows without their names; with them they show from laptop (or the zone named), off until measured', async () => {
		const view = renderStrip();
		expect(screen.queryByRole('button', { name: SCROLL_LABELS.next })).toBeNull();
		view.unmount();
		const other = renderStrip({ scrollLabels: SCROLL_LABELS });
		const previous = screen.getByRole('button', { name: SCROLL_LABELS.previous });
		const next = screen.getByRole('button', { name: SCROLL_LABELS.next });
		expect(previous).toHaveClass('hidden', 'laptop:flex');
		expect(next).toHaveClass('hidden', 'laptop:flex');
		expect(previous).toHaveAttribute('aria-controls', strip().id);
		expect(next).toHaveAttribute('aria-controls', strip().id);
		expect(previous).toBeDisabled();
		expect(next).toBeDisabled();
		other.unmount();
		renderStrip({ scrollLabels: SCROLL_LABELS, controlsFrom: 'tablet' });
		expect(screen.getByRole('button', { name: SCROLL_LABELS.next })).toHaveClass(
			'hidden',
			'tablet:flex'
		);
	});

	it('U-03.1: the arrows follow the ends and page by the whole cards in view, never choosing a day', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange } = renderStrip({ scrollLabels: SCROLL_LABELS });
		const previous = screen.getByRole('button', { name: SCROLL_LABELS.previous });
		const next = screen.getByRole('button', { name: SCROLL_LABELS.next });
		const scrollBy = vi.fn();
		strip().scrollBy = scrollBy;
		strip().scrollTo = vi.fn();
		await layout(strip(), { width: 354, scrollLeft: 0 });
		expect(previous).toBeDisabled();
		expect(next).toBeEnabled();
		await user.click(next);
		expect(scrollBy).toHaveBeenCalledWith({ left: 354 - toDayCardWidth(354) / 2 });
		await layout(strip(), { width: 354, scrollLeft: 546 });
		expect(previous).toBeEnabled();
		expect(next).toBeDisabled();
		expect(onChange).not.toHaveBeenCalled();
	});

	it('U-03.1 (negative): prints no id without a testIdPrefix, and no glyph without an icon', () => {
		const { container } = render(DateStrip, {
			props: { days: DAYS, value: DAYS[0].value, 'aria-label': 'Ημέρες' }
		});
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.querySelector('[data-slot="ionicon"]')).toBeNull();
	});

	it('U-03.1 (NIT-1, negative): the group of days needs its name', () => {
		// @ts-expect-error a group of buttons without a name
		const props: ComponentProps<typeof DateStrip> = { days: DAYS, value: DAYS[0].value };
		expect(props.days).toBe(DAYS);
	});

	it('U-02.2: draws the strip as the application’s day strip, class for class (M-08)', () => {
		renderStrip({ value: DAYS[1].value });
		expect(screen.getByTestId(`${PREFIX}-row`)).toHaveClass('flex', 'flex-row', 'gap-touch-gap');
		const base = [
			'min-w-day-card-min-w',
			'min-h-touch',
			'shrink-0',
			'flex-col',
			'items-center',
			'gap-1',
			'rounded-lg',
			'border',
			'px-1',
			'py-3'
		];
		expect(card('2026-07-30')).toHaveClass(...base, 'border-foreground');
		expect(card('2026-07-30')).not.toHaveClass('border-border');
		expect(card('2026-07-29')).toHaveClass(...base, 'border-border');
		expect(card('2026-07-31')).toHaveClass(...base, 'border-border', 'opacity-40');
		expect(within(card('2026-07-30')).getByText('Πέμ 30')).toHaveClass(
			'text-label-lg',
			'text-foreground',
			'font-semibold'
		);
		expect(within(card('2026-07-29')).getByText('Τετ 29')).not.toHaveClass('font-semibold');
		expect(within(card('2026-07-29')).getByText('Ιουλ')).toHaveClass(
			'text-label-md',
			'text-muted-foreground'
		);
		const glyph = card('2026-07-29').querySelector('[data-slot="ionicon"]');
		expect(glyph).toHaveAttribute('data-icon', 'calendar-outline');
		expect(glyph).toHaveClass('icon-md', 'text-foreground');
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = renderStrip({ scrollLabels: SCROLL_LABELS });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
