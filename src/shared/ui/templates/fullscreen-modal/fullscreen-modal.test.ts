import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './fullscreen-modal.harness.svelte';

describe('FullscreenModalTemplate', () => {
	it('U-03.1 (K2.5): the search modals’ shell — background surface, ModalHeader with the lifted «×», the padded column', () => {
		render(Harness);
		const dialog = screen.getByRole('dialog', { name: 'Φίλτρα' });
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(dialog).toHaveClass(
			'bg-background',
			'fixed',
			'inset-0',
			'tablet:max-w-dialog',
			'tablet:rounded-xl'
		);
		expect(dialog).not.toHaveClass('bg-card');
		expect(screen.getByRole('heading', { level: 2, name: 'Φίλτρα' })).toHaveClass('text-title-xs');
		expect(screen.getByTestId('filters-close')).toHaveClass('shadow-floating');
		const scroll = document.querySelector('[data-slot="fullscreen-modal-scroll"]');
		expect(scroll).toHaveClass('bg-background', 'px-3.5', 'tablet:px-6', 'pt-1', 'pb-section');
		expect((scroll as HTMLElement).inert).toBeFalsy();
		const content = document.querySelector('[data-slot="fullscreen-modal-content"]');
		expect(content).toHaveClass('mx-auto', 'w-full', 'gap-3', 'tablet:max-w-form');
		expect(dialog.querySelector('[data-slot="action-bar"]')).toHaveClass('shadow-bar');
	});

	it('U-03.1 (K2.5): the filters’ gap is 20; a panel over the column makes it inert', () => {
		render(Harness, { props: { contentGap: 'loose', hideContentFromA11y: true } });
		expect(document.querySelector('[data-slot="fullscreen-modal-content"]')).toHaveClass('gap-5');
		const scroll = document.querySelector<HTMLElement>('[data-slot="fullscreen-modal-scroll"]');
		expect(scroll?.inert).toBe(true);
	});

	it('U-03.1 (K2.5): «×» and Escape call onClose and close the modal', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		const view = render(Harness, { props: { onClose } });
		await user.click(screen.getByRole('button', { name: 'Κλείσιμο φίλτρων' }));
		expect(onClose).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		view.unmount();
		render(Harness, { props: { onClose } });
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledTimes(2);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1 (NIT-5): closing gives the focus back to the control that opened it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initialOpen: false } });
		const opener = screen.getByRole('button', { name: 'Αναζήτηση' });
		opener.focus();
		await user.keyboard('{Enter}');
		expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(opener).toHaveFocus();
	});

	it('U-09.15 (5τ): `contentGap` is the application’s `tight` (12, default) or `loose` (20)', () => {
		const tight = render(Harness);
		expect(document.querySelector('[data-slot="fullscreen-modal-content"]')).toHaveClass('gap-3');
		tight.unmount();
		render(Harness, { props: { contentGap: 'loose' } });
		expect(document.querySelector('[data-slot="fullscreen-modal-content"]')).toHaveClass('gap-5');
	});

	it('U-09.15 (5τ): the `overlay` is drawn last inside the surface, over the column (the application’s)', () => {
		render(Harness, { props: { withOverlay: true, hideContentFromA11y: true } });
		const dialog = screen.getByRole('dialog');
		const overlay = screen.getByTestId('overlay');
		expect(dialog.contains(overlay)).toBe(true);
		const scroll = dialog.querySelector('[data-slot="fullscreen-modal-scroll"]') as HTMLElement;
		expect(scroll.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		const footer = dialog.querySelector('[data-slot="action-bar"]') as HTMLElement;
		expect(footer.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(scroll.inert).toBe(true);
	});

	it('U-09.7: it opens with the focus on the surface, not on its lifted «×»; Tab reaches the «×» first', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initialOpen: false } });
		await user.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
		expect(document.activeElement).toBe(screen.getByRole('dialog'));
		await user.tab();
		expect(screen.getByRole('button', { name: 'Κλείσιμο φίλτρων' })).toHaveFocus();
	});
});
