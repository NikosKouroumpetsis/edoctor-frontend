import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './general-screen.harness.svelte';

describe('GeneralScreenTemplate', () => {
	it('U-03.1: the back-nav bar — «‹» in the 40 circle at 5 %, a centred nav title between it and an equal blank', async () => {
		const user = userEvent.setup({ delay: null });
		const onBack = vi.fn();
		render(Harness, { props: { navTitle: 'Συχνές ερωτήσεις', onBack } });
		const nav = document.querySelector('[data-slot="general-screen-nav"]');
		expect(nav).toHaveClass('bg-card', 'px-4', 'pt-3', 'pb-4', 'tablet:pt-4.5');
		const back = screen.getByRole('button', { name: 'Πίσω' });
		expect(back.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
			'size-control-sm',
			'bg-foreground/5'
		);
		expect(back.querySelector('[data-icon="chevron-back"]')).not.toBeNull();
		await user.click(back);
		expect(onBack).toHaveBeenCalledOnce();
		const heading = screen.getByRole('heading', { level: 1, name: 'Συχνές ερωτήσεις' });
		expect(heading).toHaveClass('flex-1', 'text-center', 'text-title-xs', 'font-semibold');
		expect(nav?.querySelector('[data-slot="general-screen-nav-balance"]')).toHaveClass(
			'size-touch'
		);
	});

	it('U-03.1: with a page title, that is the one h1 (heading-lg) and the nav title only repeats it', () => {
		render(Harness, { props: { title: 'Ρυθμίσεις', navTitle: 'Ρυθμίσεις' } });
		const headings = screen.getAllByRole('heading', { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveClass('text-heading-lg', 'font-semibold', 'text-foreground');
		expect(document.querySelector('[data-slot="general-screen-nav-title"]')?.tagName).toBe('P');
	});

	it('U-03.1: the content column — the zone gutters, form wide by default, a section apart; «‹» may be a link', () => {
		const view = render(Harness, { props: { backHref: '/el' } });
		const content = document.querySelector('[data-slot="general-screen-content"]');
		expect(content).toHaveClass(
			'px-gutter-sm',
			'split:px-gutter-md',
			'desktop:px-gutter-lg',
			'pt-3',
			'pb-section',
			'tablet:pt-4.5',
			'tablet:pb-section-lg'
		);
		expect(content?.firstElementChild).toHaveClass('mx-auto', 'max-w-form', 'gap-section');
		expect(screen.getByRole('link', { name: 'Πίσω' })).toHaveAttribute('href', '/el');
		expect(document.querySelector('[data-slot="general-screen-footer"]')).toBeNull();
		view.unmount();
		render(Harness, { props: { maxWidth: 'content', withFooter: true } });
		expect(
			document.querySelector('[data-slot="general-screen-content"]')?.firstElementChild
		).toHaveClass('max-w-content');
		expect(document.querySelector('[data-slot="general-screen-footer"]')).toHaveClass(
			'sticky',
			'bottom-0',
			'border-t',
			'border-border/60',
			'bg-card'
		);
	});
});
