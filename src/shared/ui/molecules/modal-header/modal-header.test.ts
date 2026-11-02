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

	it('U-24.3 (§7.5, NIT-r2-5): `plain` is Airbnb’s filters header — the bare «×» in its 48 box over a hairline, the title still centred', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		render(ModalHeader, {
			props: { title: 'Φίλτρα', closeLabel: 'Κλείσιμο', onClose, plain: true, closeTestId: 'close' }
		});
		const header = document.querySelector('[data-slot="modal-header"]');
		expect(header).toHaveAttribute('data-plain', 'true');
		expect(header).toHaveClass('px-5', 'pt-4', 'pb-5', 'border-b', 'border-border/60');
		expect(screen.getByRole('heading', { level: 2, name: 'Φίλτρα' })).toHaveClass('text-center');
		const close = screen.getByTestId('close');
		expect(close).toHaveAttribute('data-appearance', 'bare');
		expect(close).toHaveClass('size-touch');
		expect(close).not.toHaveClass('shadow-floating');
		expect(close.querySelector('[data-icon="close"]')).toHaveClass('icon-md');
		await user.click(close);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('U-24.3 (negative, NIT-r2-5): `plain` lifts nothing even when asked — `closeElevated` stays the outline header’s', () => {
		render(ModalHeader, {
			props: {
				title: 'Φίλτρα',
				closeLabel: 'Κλείσιμο',
				onClose: vi.fn(),
				plain: true,
				closeElevated: true
			}
		});
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		expect(close).toHaveAttribute('data-appearance', 'bare');
		expect(close).not.toHaveClass('shadow-floating');
	});

	it('U-03.1 (negative, NIT-r2-5): without `plain` no hairline under the header', () => {
		render(ModalHeader, {
			props: { title: 'Αναζήτηση', closeLabel: 'Κλείσιμο', onClose: vi.fn() }
		});
		const header = document.querySelector('[data-slot="modal-header"]');
		expect(header).toHaveAttribute('data-plain', 'false');
		expect(header).not.toHaveClass('border-b');
	});
});
