import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ThumbnailCard from './thumbnail-card.svelte';

const base = {
	imageUrl: 'data:image/png;base64,AA==',
	imageClass: 'h-article-group-media',
	title: 'Πέντε συνήθειες για μια υγιή καρδιά',
	class: 'w-article-group-w'
};

describe('ThumbnailCard', () => {
	it('U-03.1 (K3.2, M-31β): the profile’s article card — a rounded muted photo box, a two-line title, three muted lines', () => {
		const { container } = render(ThumbnailCard, {
			props: { ...base, description: 'Μικρές αλλαγές που κάνουν διαφορά.' }
		});
		const card = container.querySelector('[data-slot="thumbnail-card"]') as HTMLElement;
		expect(card).toHaveClass('flex', 'flex-col', 'gap-3', 'w-article-group-w');
		const box = container.querySelector('[data-slot="thumbnail-card-media"]') as HTMLElement;
		expect(box).toHaveClass(
			'w-full',
			'overflow-hidden',
			'rounded-xl',
			'bg-muted',
			'h-article-group-media'
		);
		const image = box.querySelector('img') as HTMLImageElement;
		expect(image).toHaveAttribute('loading', 'lazy');
		expect(image).toHaveAttribute('alt', '');
		expect(image).toHaveClass('object-cover', 'size-full');
		expect(screen.getByText(base.title)).toHaveClass(
			'line-clamp-2',
			'text-body-sm',
			'leading-tight',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Μικρές αλλαγές που κάνουν διαφορά.')).toHaveClass(
			'line-clamp-3',
			'text-label-md',
			'leading-normal',
			'text-muted-foreground'
		);
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-03.1 (K3.2): the action is the kit’s underlined 13 text link in its 48 box, at the start', async () => {
		const user = userEvent.setup({ delay: null });
		const onAction = vi.fn();
		render(ThumbnailCard, { props: { ...base, actionLabel: 'Διαβάστε περισσότερα', onAction } });
		const action = screen.getByRole('button', { name: 'Διαβάστε περισσότερα' });
		expect(action).toHaveClass('min-h-touch', 'min-w-touch', 'self-start');
		expect(screen.getByText('Διαβάστε περισσότερα')).toHaveClass(
			'text-label-md',
			'underline',
			'text-foreground'
		);
		await user.click(action);
		expect(onAction).toHaveBeenCalledOnce();
		const linked = render(ThumbnailCard, {
			props: { ...base, actionLabel: 'Άνοιγμα', actionHref: '/articles/a' }
		});
		expect(linked.getByRole('link', { name: 'Άνοιγμα' })).toHaveAttribute('href', '/articles/a');
	});

	it('U-03.11: a photo that does not load leaves the muted box as the application draws it — no silhouette, no broken mark', async () => {
		const { container } = render(ThumbnailCard, { props: base });
		const image = container.querySelector('img') as HTMLImageElement;
		await fireEvent.error(image);
		const box = container.querySelector('[data-slot="thumbnail-card-media"]') as HTMLElement;
		expect(box).toHaveAttribute('data-failed', 'true');
		expect(box).toHaveClass('bg-muted');
		expect(image).toHaveClass('invisible');
		expect(container.querySelector('[data-slot="media-placeholder"]')).toBeNull();
	});

	it('U-03.1 (K3.2): the title may be a heading of the page, with the same look', () => {
		render(ThumbnailCard, { props: { ...base, titleAs: 'h3' } });
		expect(screen.getByRole('heading', { level: 3, name: base.title })).toHaveClass('text-body-sm');
	});
});
