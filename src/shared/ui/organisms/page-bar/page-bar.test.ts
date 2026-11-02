import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { PageBar } from './index';

const bar = (container: HTMLElement) =>
	container.querySelector('[data-slot="page-bar"]') as HTMLElement;
const title = (container: HTMLElement) =>
	container.querySelector('[data-slot="page-bar-title"]') as HTMLElement;

describe('PageBar (MINOR-5 of r1)', () => {
	it('U-58.3: «‹» leads where it is told, named; the application’s look shows the title at once and only below 744', () => {
		const { container } = render(PageBar, {
			props: { backHref: '/legal', backLabel: 'Πίσω', title: 'Όροι χρήσης', look: 'app' }
		});
		expect(screen.getByRole('link', { name: 'Πίσω' })).toHaveAttribute('href', '/legal');
		expect(bar(container)).toHaveClass('tablet:hidden', 'pt-3', 'pb-4', 'bg-card');
		expect(title(container)).toHaveAttribute('data-shown', 'true');
		expect(title(container)).toHaveAttribute('aria-hidden', 'true');
	});

	it('U-57.5 Ε3 (negative): with an h1 to watch, the title waits until the h1 has gone under the bar', () => {
		const heading = document.createElement('h1');
		document.body.append(heading);
		const { container } = render(PageBar, {
			props: { backHref: '/', backLabel: 'Πίσω', title: 'Άρθρα υγείας', watch: heading }
		});
		expect(title(container)).not.toHaveAttribute('data-shown');
		heading.remove();
	});

	it('U-58.1: on the application’s grey list ground the bar is grey and «‹» takes the white circle', () => {
		const { container } = render(PageBar, {
			props: {
				backHref: '/',
				backLabel: 'Πίσω',
				title: 'Άρθρα υγείας',
				look: 'app',
				ground: 'background'
			}
		});
		expect(bar(container)).toHaveClass('bg-background');
		expect(bar(container)).not.toHaveClass('bg-card');
		expect(screen.getByRole('link', { name: 'Πίσω' }).innerHTML).toContain('bg-card');
	});
});
