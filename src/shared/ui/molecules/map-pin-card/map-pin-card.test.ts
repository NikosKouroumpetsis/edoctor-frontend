import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './map-pin-card.harness.svelte';

describe('MapPinCard', () => {
	// Rewritten by U-27.4 (the owner's choice of 15:22, app = web): the card's lines may hold a button of their own
	// («Συνδεθείτε για κόστος»), and no control may sit inside an `<a>` — so the ONE link no longer wraps the photo and
	// the lines but lies under them (the media card's way, Airbnb's), which let a press through to it.
	it('U-24.4 / U-27.4: the pin’s card — ONE link over the whole card, the 128 photo on the left, the lines beside it, the 16 corner and the floating shadow', () => {
		render(Harness, { props: { imageUrl: 'https://cdn.example/a.jpg' } });
		const card = screen.getByTestId('pin-card');
		expect(card).toHaveClass(
			'relative',
			'flex',
			'overflow-hidden',
			'rounded-lg',
			'bg-card',
			'shadow-floating'
		);
		const link = screen.getByRole('link', { name: 'Προφίλ Α. Παππάς' });
		expect(link).toHaveAttribute('href', '/doctors/a-pappas');
		expect(link).toHaveClass('absolute', 'inset-0', 'min-h-touch', 'w-full');
		expect(link.parentElement).toBe(card);
		const media = card.querySelector('[data-slot="map-pin-card-media"]') as HTMLElement;
		expect(media).toHaveClass('w-map-card-media', 'shrink-0', 'relative', 'pointer-events-none');
		expect(media.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/a.jpg');
		const body = card.querySelector('[data-slot="map-pin-card-body"]') as HTMLElement;
		expect(body).toHaveTextContent('Καρδιολόγος · Αμπελόκηποι');
		expect(body).toHaveClass(
			'relative',
			'pointer-events-none',
			'[&_a]:pointer-events-auto',
			'[&_button]:pointer-events-auto'
		);
		// The link lies first and under them; its focus ring is the card's own (the photo covers the link's edges).
		expect(link.compareDocumentPosition(media)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(card).toHaveClass('has-[[data-slot=map-pin-card-link]:focus-visible]:ring-3');
	});

	it('U-27.4: a button of the lines is its own target over the link — never inside it — and its press reaches it alone', async () => {
		const onLine = vi.fn();
		render(Harness, { props: { onLine } });
		const link = screen.getByRole('link', { name: 'Προφίλ Α. Παππάς' });
		const followed = vi.fn((event: Event) => event.preventDefault());
		link.addEventListener('click', followed);
		const action = screen.getByRole('button', { name: 'Ενέργεια γραμμής' });
		expect(action.closest('a')).toBeNull();
		expect(link).not.toContainElement(action);
		await userEvent.setup({ delay: null }).click(action);
		expect(onLine).toHaveBeenCalledOnce();
		expect(followed).not.toHaveBeenCalled();
	});

	it('U-24.4: the «×» is its own button outside the link and calls onClose', async () => {
		const onClose = vi.fn();
		render(Harness, { props: { onClose } });
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		expect(close.closest('a')).toBeNull();
		expect(close).toHaveAttribute('data-testid', 'pin-card-close');
		await userEvent.setup({ delay: null }).click(close);
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('U-24.4 (negative): no photo ⇒ the muted frame’s silhouette, never a broken image', () => {
		render(Harness, { props: { imageUrl: null } });
		const media = document.querySelector('[data-slot="map-pin-card-media"]');
		expect(media?.querySelector('img')).toBeNull();
		expect(media).toHaveClass('bg-muted');
	});

	it('U-12.2: it rises in on CSS the first time it is drawn (`starting:`), on the motion token', () => {
		render(Harness);
		expect(screen.getByTestId('pin-card')).toHaveClass(
			'starting:translate-y-2',
			'starting:opacity-0',
			'duration-standard',
			'ease-standard'
		);
	});
});
