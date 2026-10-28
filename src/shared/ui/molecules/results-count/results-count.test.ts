import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ResultsCount from './results-count.svelte';

const sorted = (element: Element) => [...element.classList].sort();
const CARD = [
	'flex',
	'flex-col',
	'rounded-xl',
	'border',
	'border-border/70',
	'bg-card/95',
	'shadow-soft'
];

describe('ResultsCount', () => {
	it('U-02.2 (K6.3, M-40): the count over its muted line, in the application’s card with the 20 inset, class for class', () => {
		render(ResultsCount, {
			props: {
				title: '128 αποτελέσματα',
				supporting: 'Με τα κριτήρια που επιλέξατε.',
				testId: 'count'
			}
		});
		const card = screen.getByTestId('count');
		expect(sorted(card)).toEqual([...CARD, 'gap-2', 'p-5'].sort());
		expect(sorted(screen.getByText('128 αποτελέσματα'))).toEqual(
			['text-title-md', 'font-semibold', 'text-foreground'].sort()
		);
		expect(sorted(screen.getByText('Με τα κριτήρια που επιλέξατε.'))).toEqual(
			['text-body-sm', 'text-muted-foreground'].sort()
		);
	});

	it('U-03.1 (a11y): a polite live region read whole, the same one when the count changes', async () => {
		const view = render(ResultsCount, { props: { title: '128 αποτελέσματα', testId: 'count' } });
		const card = screen.getByTestId('count');
		expect(card).toHaveAttribute('aria-live', 'polite');
		expect(card).toHaveAttribute('aria-atomic', 'true');
		expect(card).not.toHaveAttribute('role');
		await view.rerender({ title: '12 αποτελέσματα', testId: 'count' });
		expect(screen.getByTestId('count')).toBe(card);
		expect(card).toHaveTextContent(/^12 αποτελέσματα$/);
	});

	it('U-03.1 (negative): without a line (none, null, empty) only the count; no id the caller did not give', () => {
		for (const supporting of [undefined, null, '']) {
			const { container, unmount } = render(ResultsCount, {
				props: { title: 'Κανένα αποτέλεσμα', supporting }
			});
			const card = container.querySelector('[data-slot="results-count"]') as HTMLElement;
			expect(card.children).toHaveLength(1);
			expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
			unmount();
		}
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens', () => {
		const { container } = render(ResultsCount, { props: { title: '1.000+ αποτελέσματα' } });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
