import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './carousel-section.harness.svelte';

const itemsOf = (container: HTMLElement) =>
	container.querySelector('[data-slot="rail-items"]') as HTMLElement;

describe('CarouselSection', () => {
	it('U-09.4: the application’s home rail — the bold title (20, 22 from the tablet), the muted line, 14 to the row', () => {
		const { container } = render(Harness, { props: { subtitle: 'Στην Αθήνα' } });
		const root = container.querySelector('[data-component="carousel-section"]');
		expect(root).toHaveClass('gap-3.5', 'harness-column');
		const title = screen.getByRole('heading', { level: 2, name: 'Δημοφιλείς γιατροί' });
		expect(title).toHaveClass(
			'text-title-lg',
			'font-bold',
			'text-foreground',
			'tablet:text-heading-sm'
		);
		expect(screen.getByText('Στην Αθήνα')).toHaveClass('text-body-md', 'text-muted-foreground');
	});

	it('U-09.4: the cards in a sideways row 12 apart with no bar, the caller’s row classes after the kit’s', () => {
		const { container } = render(Harness, { props: { itemsClass: 'pb-2' } });
		const row = itemsOf(container);
		expect(row).toHaveClass(
			'flex',
			'flex-row',
			'gap-3',
			'overflow-x-auto',
			'scrollbar-none',
			'pb-2'
		);
		expect(row.querySelectorAll('a')).toHaveLength(2);
	});

	it('U-09.4: a pressable circle is named by the caller and acts; the static one is hidden and inert', async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		const pressable = render(Harness, {
			props: { trailing: { icon: 'arrow-forward', label: 'Δείτε όλα', onclick } }
		});
		await user.click(screen.getByRole('button', { name: 'Δείτε όλα' }));
		expect(onclick).toHaveBeenCalledOnce();
		pressable.unmount();
		const still = render(Harness, { props: { trailing: { icon: 'arrow-forward' } } });
		expect(still.queryByRole('button')).toBeNull();
		const circle = still.container.querySelector('[data-slot="icon-button"]');
		expect(circle).toHaveAttribute('aria-hidden', 'true');
		expect(circle).toHaveClass('mt-0.5');
	});

	it('U-09.4 (negative): without a subtitle or a trailing nothing is drawn in their place', () => {
		const { container } = render(Harness);
		expect(container.querySelector('[data-slot="section-subtitle"]')).toBeNull();
		expect(container.querySelector('[data-slot="icon-button"]')).toBeNull();
	});
});
