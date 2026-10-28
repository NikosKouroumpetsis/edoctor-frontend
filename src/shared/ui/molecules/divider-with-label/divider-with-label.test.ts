import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DividerWithLabel from './divider-with-label.svelte';

describe('DividerWithLabel', () => {
	it('U-03.1: writes the word between two flexible hairlines (K1.9, the sign-in «ή»)', () => {
		const { container } = render(DividerWithLabel, { props: { label: 'ή' } });
		const row = container.querySelector('[data-slot="divider-with-label"]') as HTMLElement;
		expect(row).toHaveClass('flex', 'flex-row', 'items-center', 'gap-4');
		const lines = row.querySelectorAll('[data-slot="divider"]');
		expect(lines).toHaveLength(2);
		for (const line of lines) expect(line).toHaveClass('flex-1', 'border-t');
		for (const line of lines) expect(line).not.toHaveClass('py-4');
		expect(screen.getByText('ή')).toHaveClass('text-body-md', 'text-muted-foreground');
	});
});
