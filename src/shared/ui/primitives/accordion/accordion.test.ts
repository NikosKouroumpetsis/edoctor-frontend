import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { cubicBezier, cubicBezierCss, motion } from '$shared/design/tokens';
import { ACCORDION_DURATION } from './index';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import Harness from './accordion.harness.svelte';

const itemOf = (name: string) =>
	screen.getByRole('button', { name }).closest('[data-slot="accordion-item"]') as HTMLElement;

describe('Accordion', () => {
	it('expands an item on trigger click and links trigger/region via ARIA', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'single' } });
		const trigger = screen.getByRole('button', { name: 'Question one' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		await user.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		const region = await screen.findByRole('region');
		expect(region).toHaveTextContent('Answer one');
		expect(region).toHaveAttribute('aria-labelledby', trigger.id);
	});

	it('single mode collapses the previous item when another opens', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'single' } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		await screen.findByText('Answer one');
		await user.click(screen.getByRole('button', { name: 'Question two' }));
		await screen.findByText('Answer two');
		await waitFor(() => expect(screen.queryByText('Answer one')).not.toBeInTheDocument());
	});

	it('multiple mode keeps several items open', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { type: 'multiple' } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		await user.click(screen.getByRole('button', { name: 'Question two' }));
		expect(await screen.findByText('Answer one')).toBeInTheDocument();
		expect(await screen.findByText('Answer two')).toBeInTheDocument();
	});

	it('U-03.1 (K4.5): the default item is the application’s — a 60 % line between items, a 48 row, 16 apart', () => {
		render(Harness, { props: {} });
		expect(itemOf('Question one')).toHaveClass(
			'overflow-hidden',
			'border-b',
			'border-border/60',
			'last:border-b-0'
		);
		expect(screen.getByRole('button', { name: 'Question one' })).toHaveClass(
			'flex',
			'min-h-touch',
			'w-full',
			'flex-row',
			'items-center',
			'justify-between',
			'gap-4',
			'py-4'
		);
		expect(screen.getByRole('button', { name: 'Question one' })).not.toHaveClass('px-4');
	});

	it('U-03.1 (K4.5, M-34, from the application): `card` — the bordered card on the card surface, the trigger and the content inset 16', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { variant: 'card', value: 'two' } });
		expect(itemOf('Question one')).toHaveClass(
			'overflow-hidden',
			'rounded-lg',
			'border',
			'border-border/60',
			'bg-card',
			'last:border-b-0'
		);
		expect(itemOf('Question one')).toHaveAttribute('data-variant', 'card');
		const trigger = screen.getByRole('button', { name: 'Question one' });
		expect(trigger).toHaveClass('px-4', 'py-4', 'min-h-touch');
		// The caller's column classes (the criteria's `gap-3.5`, here `gap-0.5 pt-2`) come first; the card's inset wins.
		const second = screen.getByText('Answer two').closest('[data-slot="accordion-content-inner"]');
		expect(second).toHaveClass('flex', 'flex-col', 'gap-0.5', 'px-4', 'pt-1', 'pb-4');
		expect(second).not.toHaveClass('pt-2');
		await user.click(trigger);
		const inner = (await screen.findByText('Answer one')).closest(
			'[data-slot="accordion-content-inner"]'
		);
		expect(inner).toHaveClass('px-4', 'pt-1', 'pb-4');
		expect(inner).not.toHaveClass('gap-3.5');
	});

	it('U-03.1 (K4.5): the chevron only on request — muted 20, turned over while open, the application’s test id', async () => {
		const user = userEvent.setup();
		const plain = render(Harness, { props: {} });
		expect(plain.container.querySelector('[data-icon="chevron-down"]')).toBeNull();
		plain.unmount();
		render(Harness, { props: { showChevron: true } });
		const chevron = screen.getByTestId('one-accordion-chevron');
		// U-09.11: the same 220 ms and curve as the content, through the named motion token (was `duration-220`);
		// U-12.6: it turns whatever the motion setting (R2's `motion-reduce:transition-none` is gone, U-12.1).
		expect(chevron).toHaveClass(
			'icon-md',
			'text-muted-foreground',
			'transition-transform',
			'duration-accordion',
			'ease-accordion'
		);
		expect(chevron).not.toHaveClass('motion-reduce:transition-none');
		expect(chevron.getAttribute('class')).not.toMatch(/duration-\d/);
		expect(chevron).not.toHaveClass('rotate-180');
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(chevron).toHaveClass('rotate-180');
		expect(chevron).toHaveAttribute('aria-hidden', 'true');
	});

	it('U-03.1 (K4.5): single keeps the open item open unless `collapsible`', async () => {
		const user = userEvent.setup();
		const fixed = render(Harness, { props: { value: 'one' } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(screen.getByRole('button', { name: 'Question one' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		fixed.unmount();
		render(Harness, { props: { value: 'one', collapsible: true } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(screen.getByRole('button', { name: 'Question one' })).toHaveAttribute(
			'aria-expanded',
			'false'
		);
	});

	it('U-03.1 (negative): `toggleOnClick={false}` or a `preventDefault` calls the press and leaves the item; disabled refuses', async () => {
		const user = userEvent.setup();
		const onTriggerClick = vi.fn();
		const off = render(Harness, { props: { toggleOnClick: false, onTriggerClick } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(onTriggerClick).toHaveBeenCalledOnce();
		expect(screen.queryByText('Answer one')).toBeNull();
		off.unmount();
		const prevented = render(Harness, { props: { preventToggle: true, onTriggerClick } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(onTriggerClick).toHaveBeenCalledTimes(2);
		expect(screen.queryByText('Answer one')).toBeNull();
		prevented.unmount();
		render(Harness, { props: { disabled: true } });
		expect(screen.getByRole('button', { name: 'Question one' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Question one' })).toHaveClass('disabled:opacity-50');
	});

	// Rewritten from U-03.1 (risk β) / U-09.11 / U-09.13 (a Svelte `slide` + opacity, in place under reduced motion,
	// R2): the same 220 ms height and opacity together, in CSS now (U-12.6, U-12.2), whatever the setting (U-12.1).
	it('U-12.6: it opens and closes in 220 ms in CSS — the height (one grid row 0fr ⇔ 1fr) with the opacity', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const css = holdTransitions();
		const user = userEvent.setup();
		render(Harness, { props: { collapsible: true } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		const region = screen.getByRole('region');
		for (const name of [
			'grid',
			'grid-rows-[1fr]',
			'overflow-hidden',
			'transition-[grid-template-rows,opacity]',
			'duration-accordion',
			'ease-accordion',
			'starting:grid-rows-[0fr]',
			'starting:opacity-0',
			'data-[state=closed]:grid-rows-[0fr]',
			'data-[state=closed]:opacity-0'
		]) {
			expect(region).toHaveClass(name);
		}
		// The row's one cell may shrink to 0 (`min-h-0`) and clips; the padded column sits inside it.
		const cell = region.firstElementChild as HTMLElement;
		expect(region.children).toHaveLength(1);
		expect(cell).toHaveAttribute('data-slot', 'accordion-content-cell');
		expect(cell).toHaveClass('min-h-0', 'overflow-hidden');
		expect(cell.firstElementChild).toHaveAttribute('data-slot', 'accordion-content-inner');
		expect(region).toHaveAttribute('data-state', 'open');

		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(region).toHaveAttribute('data-state', 'closed');
		expect(region).toHaveAttribute('inert');
		expect(region.isConnected).toBe(true);
		css.end(region);
		await waitFor(() => expect(region.isConnected).toBe(false));
		expect(animate).not.toHaveBeenCalled();
		animate.mockRestore();
	});

	it('U-12.1 (negative): under reduced motion the content still closes in its 220 ms', async () => {
		reduceMotion();
		holdTransitions();
		const user = userEvent.setup();
		render(Harness, { props: { collapsible: true, showChevron: true } });
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		const region = screen.getByRole('region');
		expect(region).toHaveClass('starting:grid-rows-[0fr]', 'duration-accordion');
		expect(screen.getByTestId('one-accordion-chevron').getAttribute('class')).not.toMatch(
			/motion-(reduce|safe):/
		);
		await user.click(screen.getByRole('button', { name: 'Question one' }));
		expect(region).toHaveAttribute('data-state', 'closed');
		expect(region.isConnected).toBe(true);
	});

	it('U-03.1 (W-LIVE-2): the item clips at the trigger’s edges, so the trigger’s ring is inset — on the card, in its corners', () => {
		const plain = render(Harness, { props: {} });
		expect(itemOf('Question one')).toHaveClass('overflow-hidden');
		const trigger = screen.getByRole('button', { name: 'Question one' });
		expect(trigger).toHaveClass('w-full', 'focus-visible:ring-3', 'focus-visible:ring-inset');
		expect(trigger.className).not.toMatch(/(^|\s)rounded-/);
		plain.unmount();
		render(Harness, { props: { variant: 'card' } });
		expect(itemOf('Question one')).toHaveClass('overflow-hidden', 'rounded-lg');
		expect(screen.getByRole('button', { name: 'Question one' })).toHaveClass(
			'focus-visible:ring-inset',
			'rounded-lg',
			'px-4'
		);
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(Harness, { props: { variant: 'card', showChevron: true } });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});

	it('U-09.11: the content and the chevron share the application’s `accordionAnimationDuration` and curve', () => {
		const app = readFileSync(
			resolve(process.cwd(), '../application/src/shared/ui/molecules/accordion/index.tsx'),
			'utf8'
		);
		expect(/const accordionAnimationDuration = (\d+);/.exec(app)?.[1]).toBe(
			String(motion.duration.accordion)
		);
		expect(ACCORDION_DURATION).toBe(motion.duration.accordion);
		expect(cubicBezierCss('accordion')).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
		// The CSS curve is Reanimated's `withTiming` default, `Easing.inOut(Easing.quad)`.
		const quadInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
		const bezier = cubicBezier(...motion.easing.accordion);
		for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
			expect(Math.abs(bezier(t) - quadInOut(t))).toBeLessThan(0.03);
		}
	});
});
