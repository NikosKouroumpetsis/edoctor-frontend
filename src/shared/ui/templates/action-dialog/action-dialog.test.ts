import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './action-dialog.harness.svelte';

describe('ActionDialog (U-84 Π1)', () => {
	it('is named by its title and holds its words; its «×» closes it', async () => {
		render(Harness);
		const dialog = screen.getByRole('dialog', { name: 'Τίτλος' });
		expect(dialog).toHaveTextContent('Το κείμενο');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Κλείσιμο' }));
		expect(dialog).toHaveAttribute('data-state', 'closed');
	});

	it('Escape closes it', async () => {
		render(Harness);
		const dialog = screen.getByRole('dialog', { name: 'Τίτλος' });
		await fireEvent.keyDown(dialog, { key: 'Escape' });
		expect(dialog).toHaveAttribute('data-state', 'closed');
	});

	it('with `onDismiss` the caller decides, and it stays open', async () => {
		const onDismiss = vi.fn();
		render(Harness, { props: { onDismiss } });
		await userEvent.setup({ delay: null }).click(screen.getByRole('button', { name: 'Κλείσιμο' }));
		expect(onDismiss).toHaveBeenCalledOnce();
		expect(screen.getByRole('dialog', { name: 'Τίτλος' })).toHaveAttribute('data-state', 'open');
	});

	it('Δ3: its one line is cut by default; `wrapTitle` lets a long title take its lines, the bar growing with it', () => {
		const view = render(Harness);
		const bar = () => screen.getByTestId('dialog').querySelector('[data-slot="action-dialog-bar"]');
		expect(screen.getByRole('heading', { level: 2 })).toHaveClass('truncate');
		expect(bar()).toHaveClass('h-control-lg', 'tablet:h-bar-top');
		view.unmount();
		render(Harness, { props: { wrapTitle: true } });
		expect(screen.getByRole('heading', { level: 2 })).not.toHaveClass('truncate');
		expect(bar()).toHaveClass('min-h-control-lg', 'tablet:min-h-bar-top');
		expect(bar()).not.toHaveClass('h-control-lg');
	});

	it('its footer stays under the scroll', () => {
		render(Harness, { props: { withFooter: true } });
		expect(screen.getByRole('button', { name: 'Εντάξει' })).toBeInTheDocument();
	});
});
