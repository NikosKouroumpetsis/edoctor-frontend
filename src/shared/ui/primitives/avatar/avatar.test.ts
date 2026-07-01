import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Harness from './avatar.harness.svelte';
import Avatar from './avatar.svelte';

describe('Avatar', () => {
	it('defaults the root box to size-10 and scales with the size prop', () => {
		const { container, unmount } = render(Avatar);
		expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('size-10');
		unmount();

		const sm = render(Avatar, { props: { size: 'sm' } });
		expect(sm.container.querySelector('[data-slot="avatar"]')).toHaveClass('size-8');
		sm.unmount();

		const lg = render(Avatar, { props: { size: 'lg' } });
		expect(lg.container.querySelector('[data-slot="avatar"]')).toHaveClass('size-12');
	});

	it('shows the fallback while the image has not loaded', () => {
		render(Harness, { props: { src: 'https://example.com/a.png' } });
		expect(screen.getByText('JD')).toBeInTheDocument();
	});

	it('hides the fallback once the image loads', async () => {
		const { container } = render(Harness, { props: { src: 'https://example.com/a.png' } });
		const img = container.querySelector('img')!;
		await fireEvent.load(img);
		expect(screen.queryByText('JD')).not.toBeInTheDocument();
	});

	it('keeps the fallback and drops the image on load error', async () => {
		const { container } = render(Harness, { props: { src: 'https://example.com/broken.png' } });
		const img = container.querySelector('img')!;
		await fireEvent.error(img);
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByText('JD')).toBeInTheDocument();
	});
});
