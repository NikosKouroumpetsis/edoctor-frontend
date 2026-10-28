import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ModalHeader from './modal-header.svelte';

describe('ModalHeader', () => {
	it('U-03.1 (K2.5): the title takes the width between an equal blank and the outline «×» (title-xs semibold, centred)', () => {
		render(ModalHeader, {
			props: { title: 'Φίλτρα', closeLabel: 'Κλείσιμο', onClose: vi.fn(), titleId: 'filters-title' }
		});
		const header = document.querySelector('[data-slot="modal-header"]');
		expect(header).toHaveClass('px-5', 'pt-4', 'pb-5');
		const title = screen.getByRole('heading', { level: 2, name: 'Φίλτρα' });
		expect(title).toHaveAttribute('id', 'filters-title');
		expect(title).toHaveClass('flex-1', 'text-center', 'text-title-xs', 'font-semibold');
		const balance = header?.querySelector('[data-slot="modal-header-balance"]');
		expect(balance).toHaveClass('size-touch');
		expect(balance).toHaveAttribute('aria-hidden', 'true');
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		expect(close).toHaveAttribute('data-appearance', 'outline');
		expect(close).toHaveClass('size-touch');
		expect(close).not.toHaveClass('shadow-floating');
		expect(close.querySelector('[data-icon="close"]')).not.toBeNull();
	});

	it('U-03.1 (K2.5): «×» calls onClose; the search modals lift it (the application’s shadow, on the elevation scale)', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		render(ModalHeader, {
			props: {
				title: 'Αναζήτηση',
				closeLabel: 'Κλείσιμο',
				onClose,
				closeElevated: true,
				closeTestId: 'search-close'
			}
		});
		const close = screen.getByTestId('search-close');
		expect(close).toHaveClass('shadow-floating', 'rounded-full');
		await user.click(close);
		expect(onClose).toHaveBeenCalledOnce();
	});
});
