import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Divider from './divider.svelte';

const of = (container: HTMLElement) =>
	container.querySelector('[data-slot="divider"]') as HTMLElement;

describe('Divider', () => {
	it('U-03.1: draws its top hairline padded py-4, and may hold content (D16)', () => {
		const { container } = render(Divider, {
			props: { children: createRawSnippet(() => ({ render: () => '<p>Περιεχόμενο</p>' })) }
		});
		expect(of(container)).toHaveClass('border-t', 'border-border/60', 'py-4');
		expect(of(container)).toHaveTextContent('Περιεχόμενο');
	});

	// U-06.6 changes the vertical `px-4` this test pinned (U-03.1) to `mx-4`: the owner saw the line glued to the
	// first word (2ζ), because a padding sits on one side of the left edge only.
	it('U-06.6: the vertical line has the same 16 on both sides (mx-4, no padding); spacing none drops it', () => {
		const vertical = render(Divider, { props: { orientation: 'vertical' } });
		const line = of(vertical.container);
		expect(line).toHaveClass('self-stretch', 'border-l', 'border-border/60', 'mx-4');
		expect([...line.classList].filter((name) => /^(p|px|pl|pr|ml|mr|ms|me)-/.test(name))).toEqual(
			[]
		);
		vertical.unmount();
		const verticalTight = render(Divider, { props: { orientation: 'vertical', spacing: 'none' } });
		expect(of(verticalTight.container)).not.toHaveClass('mx-4');
		verticalTight.unmount();
		const tight = render(Divider, { props: { spacing: 'none' } });
		expect(of(tight.container)).not.toHaveClass('py-4');
	});
});
