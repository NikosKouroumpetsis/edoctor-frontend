import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { brandName } from '$shared/design/tokens';
import Wordmark from './wordmark.svelte';

describe('Wordmark', () => {
	it('U-03.7: writes the brand from its ONE token, in the sign-in lockup look (K1.8)', () => {
		render(Wordmark, { props: { as: 'h1' } });
		const mark = screen.getByRole('heading', { level: 1, name: brandName });
		expect(mark).toHaveClass('text-display-xs', 'font-bold', 'tracking-tight', 'text-primary-text');
	});
});
