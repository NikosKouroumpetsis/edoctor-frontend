import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../../../../../tests/architecture/source-scan';
import Harness from './toast.harness.svelte';
import Toast from './toast.svelte';
import { ToastState } from './toast-state.svelte';

const show = (toasts: ToastState, options: Parameters<ToastState['show']>[0]) => {
	const id = toasts.show(options);
	flushSync();
	return id;
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('Toast (20-favorites Π6)', () => {
	it('Δ4: a photo that does not open gives way to the kit’s silhouette, in its size, as on the cards', async () => {
		const leading = { kind: 'photo', src: '/broken.jpg', alt: '' } as const;
		const { container } = render(Toast, { props: { message: 'Αποθηκεύτηκε', leading } });
		const photo = container.querySelector('[data-slot="toast-photo"]') as HTMLImageElement;
		expect(photo).toHaveAttribute('src', '/broken.jpg');
		expect(container.querySelector('[data-slot="media-placeholder"]')).toBeNull();
		await fireEvent.error(photo);
		expect(container.querySelector('[data-slot="toast-photo"]')).toBeNull();
		const silhouette = container.querySelector('[data-slot="toast-photo-placeholder"]');
		expect(silhouette).toHaveClass('size-control-sm', 'shrink-0', 'rounded-sm');
		expect(silhouette?.querySelector('svg')).not.toBeNull();
	});

	it('shows the words in a live region, one action in its target; pressing it runs it and closes the card', () => {
		const toasts = new ToastState();
		render(Harness, { props: { toasts } });
		const region = screen.getByRole('status');
		expect(region).toHaveAttribute('aria-live', 'polite');
		expect(region).toBeEmptyDOMElement();
		const undo = vi.fn();
		show(toasts, {
			message: 'Αποθηκεύτηκε στα αγαπημένα',
			action: { label: 'Αναίρεση', onPress: undo }
		});
		expect(within(region).getByText('Αποθηκεύτηκε στα αγαπημένα')).toBeInTheDocument();
		within(region).getByRole('button', { name: 'Αναίρεση' }).click();
		flushSync();
		expect(undo).toHaveBeenCalledTimes(1);
		expect(toasts.current).toBeNull();
	});

	it('one at a time: the new one takes the old one’s place, with its own time', () => {
		const toasts = new ToastState();
		render(Harness, { props: { toasts } });
		show(toasts, { message: 'Πρώτο' });
		vi.advanceTimersByTime(3000);
		show(toasts, { message: 'Δεύτερο' });
		expect(screen.queryByText('Πρώτο')).not.toBeInTheDocument();
		vi.advanceTimersByTime(3000);
		expect(toasts.current?.message).toBe('Δεύτερο');
		vi.advanceTimersByTime(1000);
		expect(toasts.current).toBeNull();
	});

	it('4 s, 6 s for a failure, and it waits while the pointer or the focus is on it', () => {
		const toasts = new ToastState();
		toasts.show({ message: 'a', tone: 'danger' });
		vi.advanceTimersByTime(5000);
		expect(toasts.current).not.toBeNull();
		toasts.pause();
		vi.advanceTimersByTime(60_000);
		expect(toasts.current).not.toBeNull();
		toasts.resume();
		vi.advanceTimersByTime(1000);
		expect(toasts.current).toBeNull();
		toasts.show({ message: 'b' });
		vi.advanceTimersByTime(4000);
		expect(toasts.current).toBeNull();
	});

	it('(negative) a late `dismiss` of an older toast leaves the newer one alone', () => {
		const toasts = new ToastState();
		const old = toasts.show({ message: 'παλιό' });
		toasts.show({ message: 'νέο' });
		toasts.dismiss(old);
		expect(toasts.current?.message).toBe('νέο');
	});

	it('U-65.6 (negative): words are never markup — a tag someone typed stays text', () => {
		const toasts = new ToastState();
		render(Harness, { props: { toasts } });
		show(toasts, { message: '<img src=x onerror=alert(1)>' });
		const region = screen.getByRole('status');
		expect(region.querySelector('img')).toBeNull();
		expect(region).toHaveTextContent('<img src=x onerror=alert(1)>');
	});

	it('U-12: it moves by CSS alone — it enters with `starting:` and leaves with `data-[state=closed]:`', () => {
		const toasts = new ToastState();
		render(Harness, { props: { toasts } });
		show(toasts, { message: 'x' });
		const card = document.querySelector('[data-slot="toaster-card"]') as HTMLElement;
		expect(card.className).toContain('starting:opacity-0');
		expect(card.className).toContain('data-[state=closed]:opacity-0');
		expect(card.className).toContain('duration-standard');
	});

	it('never a singleton on the server: each tree makes its own, and the module keeps no instance', () => {
		const first = new ToastState();
		const second = new ToastState();
		first.show({ message: 'προσωπικό' });
		expect(second.current).toBeNull();
		const source = readFileSync(
			join(projectRoot, 'src/shared/ui/molecules/toast/toast-state.svelte.ts'),
			'utf8'
		);
		expect(source).not.toMatch(
			/(?:^|\n)(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*new\s+ToastState/u
		);
	});
});
