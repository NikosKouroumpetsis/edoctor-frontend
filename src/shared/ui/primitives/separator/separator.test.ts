import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import Separator from './separator.svelte';

const of = (container: HTMLElement) =>
	container.querySelector('[data-slot="separator"]') as HTMLElement;

describe('Separator', () => {
	it('U-03.1: is the application 1px line at 60 % with its my-2 margin, decorative by default', () => {
		const { container } = render(Separator);
		expect(of(container)).toHaveClass('h-px', 'w-full', 'bg-border/60', 'my-2');
		expect(of(container)).toHaveAttribute('role', 'none');
	});

	it('U-03.1: vertical takes mx-4; spacing none drops it; a meaningful line is a separator', () => {
		const vertical = render(Separator, { props: { orientation: 'vertical', decorative: false } });
		const line = of(vertical.container);
		expect(line).toHaveClass('w-px', 'self-stretch', 'bg-border/60', 'mx-4');
		expect(line).not.toHaveClass('flex-1');
		expect(line).toHaveAttribute('role', 'separator');
		expect(line).toHaveAttribute('aria-orientation', 'vertical');
		vertical.unmount();
		const tight = render(Separator, { props: { spacing: 'none' } });
		expect(of(tight.container)).not.toHaveClass('my-2');
	});

	// The root of U-06.6 was the Divider's one-sided padding; the separator was already symmetric and must stay so.
	it('U-06.6: the vertical separator has the same margin on both sides and no padding', () => {
		const { container } = render(Separator, { props: { orientation: 'vertical' } });
		const sides = [...of(container).classList].filter((name) =>
			/^(p|px|pl|pr|ml|mr|ms|me|mx)-/.test(name)
		);
		expect(sides).toEqual(['mx-4']);
	});
});
