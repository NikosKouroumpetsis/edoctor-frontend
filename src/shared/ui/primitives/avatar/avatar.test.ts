import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Harness from './avatar.harness.svelte';

describe('Avatar', () => {
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
