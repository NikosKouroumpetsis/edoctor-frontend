import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './carousel.harness.svelte';

function track(): HTMLElement {
	return document.querySelector('[data-slot="carousel-content"]') as HTMLElement;
}

describe('Carousel', () => {
	it('advances and rewinds slides, translating the track', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(track().style.transform).toBe('translateX(-0%)');

		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		expect(track().style.transform).toBe('translateX(-100%)');

		await user.click(screen.getByRole('button', { name: 'Previous slide' }));
		expect(track().style.transform).toBe('translateX(-0%)');
	});

	it('disables previous at the start and next at the end (no loop)', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();

		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		await user.click(screen.getByRole('button', { name: 'Next slide' }));
		expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
	});

	it('jumps to a slide via its dot', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Go to slide 3' }));
		expect(track().style.transform).toBe('translateX(-200%)');
	});
});
