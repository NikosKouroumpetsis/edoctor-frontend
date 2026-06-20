import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Harness from './scroll-area.harness.svelte';

function setMetrics(el: Element, metrics: Record<string, number>) {
	for (const [key, value] of Object.entries(metrics)) {
		Object.defineProperty(el, key, { configurable: true, value });
	}
}

describe('ScrollArea', () => {
	it('renders a viewport that owns the scrollable content', () => {
		const { container } = render(Harness, { props: { orientation: 'vertical' } });
		const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
		expect(viewport).toBeInTheDocument();
		expect(viewport?.className).toContain('overflow-y-auto');
		expect(viewport?.querySelector('[data-testid="scroll-content"]')).toBeInTheDocument();
	});

	it('shows a vertical thumb once the content overflows the viewport', async () => {
		const { container } = render(Harness, { props: { orientation: 'vertical' } });
		const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!;
		setMetrics(viewport, { clientHeight: 100, scrollHeight: 300, scrollTop: 0 });

		await fireEvent.scroll(viewport);

		const thumb = container.querySelector(
			'[data-slot="scroll-area-thumb"][data-orientation="vertical"]'
		) as HTMLElement | null;
		expect(thumb).toBeInTheDocument();
		expect(thumb?.style.height).not.toBe('');
	});

	it('uses horizontal overflow for the horizontal orientation', () => {
		const { container } = render(Harness, { props: { orientation: 'horizontal' } });
		const viewport = container.querySelector('[data-slot="scroll-area-viewport"]');
		expect(viewport?.className).toContain('overflow-x-auto');
	});
});
