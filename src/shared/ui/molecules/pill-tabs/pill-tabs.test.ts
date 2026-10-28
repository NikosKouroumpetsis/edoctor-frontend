import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PillTabs from './pill-tabs.svelte';

const TABS = [
	{ label: 'Κολωνάκι', value: 'office-1' },
	{ label: 'Γλυφάδα', value: 'office-2' },
	{ label: 'Μαρούσι', value: 'office-3' }
];

function renderTabs(props: Record<string, unknown> = {}) {
	const onChange = vi.fn();
	const view = render(PillTabs, {
		props: {
			tabs: TABS,
			value: 'office-1',
			onChange,
			testId: 'offices',
			testIdPrefix: 'office',
			...props
		}
	});
	return { onChange, ...view };
}

describe('PillTabs', () => {
	it('U-02.2 (K5.4): the application’s pills, class for class — the chosen one outlined in the foreground and semibold (M-11)', () => {
		renderTabs({ heading: 'Σε ποιο ιατρείο;', headingTestId: 'offices-heading' });
		expect(screen.getByTestId('offices')).toHaveClass('flex', 'flex-col', 'gap-3');
		expect(screen.getByTestId('offices-heading')).toHaveClass(
			'text-body-md',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByRole('tablist')).toHaveClass('flex', 'flex-row', 'gap-2');
		expect(screen.getByRole('tablist').parentElement).toHaveClass('overflow-x-auto');
		const base = [
			'flex',
			'min-h-touch',
			'min-w-touch',
			'shrink-0',
			'items-center',
			'justify-center',
			'rounded-full',
			'border',
			'px-4',
			'py-2.5'
		];
		expect(screen.getByTestId('office-office-1')).toHaveClass(...base, 'border-foreground');
		expect(screen.getByTestId('office-office-2')).toHaveClass(...base, 'border-border');
		expect(screen.getByText('Κολωνάκι')).toHaveClass(
			'text-body-sm',
			'text-foreground',
			'font-semibold'
		);
		expect(screen.getByText('Γλυφάδα')).not.toHaveClass('font-semibold');
	});

	it('U-03.1 (a11y): a tab list named by its question (or the caller’s name), one Tab stop, the arrows choose', async () => {
		const user = userEvent.setup({ delay: null });
		const { onChange, unmount } = renderTabs({ heading: 'Σε ποιο ιατρείο;' });
		expect(screen.getByRole('tablist', { name: 'Σε ποιο ιατρείο;' })).toBeInTheDocument();
		expect(screen.getByRole('tab', { name: 'Κολωνάκι' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Κολωνάκι' })).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('tab', { name: 'Γλυφάδα' })).toHaveAttribute('tabindex', '-1');
		await user.click(screen.getByRole('tab', { name: 'Μαρούσι' }));
		expect(onChange).toHaveBeenLastCalledWith('office-3');
		expect(screen.getByRole('tab', { name: 'Μαρούσι' })).toHaveAttribute('aria-selected', 'true');
		await user.keyboard('{ArrowRight}');
		expect(onChange).toHaveBeenLastCalledWith('office-1');
		expect(screen.getByRole('tab', { name: 'Κολωνάκι' })).toHaveFocus();
		unmount();
		renderTabs({ 'aria-label': 'Ιατρεία' });
		expect(screen.getByRole('tablist', { name: 'Ιατρεία' })).toBeInTheDocument();
	});

	it('U-02.2 (negative): no tabs draw nothing; an unknown value chooses none and keeps the first as the Tab stop', () => {
		const empty = renderTabs({ tabs: [] });
		expect(empty.container.querySelector('[data-slot="pill-tabs"]')).toBeNull();
		empty.unmount();
		renderTabs({ value: 'gone' });
		for (const tab of screen.getAllByRole('tab'))
			expect(tab).toHaveAttribute('aria-selected', 'false');
		expect(screen.getByRole('tab', { name: 'Κολωνάκι' })).toHaveAttribute('tabindex', '0');
	});

	it('U-03.1 (zones, light/dark): the same row at every width (it scrolls) and only theme tokens', () => {
		const { container } = renderTabs();
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
