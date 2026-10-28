import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Harness from './avatar.harness.svelte';
import Avatar from './avatar.svelte';

describe('Avatar', () => {
	it('defaults the root box to size-avatar-md and scales with the size prop', () => {
		const { container, unmount } = render(Avatar);
		expect(container.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-md');
		unmount();

		const sm = render(Avatar, { props: { size: 'sm' } });
		expect(sm.container.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-sm');
		sm.unmount();

		const lg = render(Avatar, { props: { size: 'lg' } });
		expect(lg.container.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-lg');
		lg.unmount();

		const xl = render(Avatar, { props: { size: 'xl' } });
		expect(xl.container.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-xl');
	});

	it('U-02.2 (K5.8): the application’s xl avatar — 64, its initials in the 18 title role', () => {
		render(Harness, { props: { size: 'xl' } });
		expect(document.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-xl');
		expect(screen.getByText('JD')).toHaveClass('text-title-sm');
		expect(screen.getByText('JD')).not.toHaveClass('text-body-sm');
	});

	// U-07.1 renames the web's `default` to the application's `md` and takes its initials (semibold, label-md up to
	// title-sm) instead of the web's body-sm / body-md: a page that keeps the old look passes its own class.
	it('U-07.1: the application’s initials per size, semibold', () => {
		for (const [size, role] of [
			['sm', 'text-label-md'],
			['md', 'text-label-md'],
			['lg', 'text-label-lg'],
			['xl', 'text-title-sm']
		] as const) {
			const view = render(Harness, { props: { size } });
			expect(screen.getByText('JD')).toHaveClass(role, 'font-semibold');
			view.unmount();
		}
		render(Harness);
		expect(document.querySelector('[data-slot="avatar"]')).toHaveClass('size-avatar-md');
		expect(screen.getByText('JD')).toHaveClass('text-label-md');
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
