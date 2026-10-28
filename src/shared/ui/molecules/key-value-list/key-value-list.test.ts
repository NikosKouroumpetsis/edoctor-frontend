import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import KeyValueList from './key-value-list.svelte';

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
const ITEMS = [
	{ id: 'what', label: 'Τι', value: 'Οποιαδήποτε κατηγορία' },
	{ id: 'where', label: 'Πού', value: 'Αθήνα' },
	{ id: 'when', label: 'Πότε', value: 'Οποτεδήποτε' }
];

describe('KeyValueList', () => {
	it('U-02.2 (K6.3, M-40): a title over one row per item in the application’s card, class for class', () => {
		render(KeyValueList, {
			props: { items: ITEMS, title: 'Κριτήρια αναζήτησης', testId: 'criteria' }
		});
		const card = screen.getByTestId('criteria');
		expect(sorted(card)).toEqual([...CARD, 'gap-4', 'p-5'].sort());
		expect(sorted(screen.getByText('Κριτήρια αναζήτησης'))).toEqual(
			['text-title-sm', 'font-semibold', 'text-foreground'].sort()
		);
		const list = card.querySelector('dl') as HTMLElement;
		expect(sorted(list)).toEqual(['flex', 'flex-col', 'gap-3'].sort());
		const row = screen.getByText('Πού').parentElement as HTMLElement;
		expect(sorted(row)).toEqual(
			['flex', 'flex-row', 'items-center', 'justify-between', 'gap-4'].sort()
		);
		// The label keeps its width (a React Native view never shrinks), the value takes the rest on ONE line.
		expect(sorted(screen.getByText('Πού'))).toEqual(
			['shrink-0', 'text-body-sm', 'font-semibold', 'text-muted-foreground'].sort()
		);
		expect(sorted(screen.getByText('Αθήνα'))).toEqual(
			[
				'min-w-0',
				'flex-1',
				'truncate',
				'text-right',
				'text-body-md',
				'font-semibold',
				'text-foreground'
			].sort()
		);
	});

	it('U-03.1 (a11y): the rows are a description list, each label a term and its value the definition, in order', () => {
		render(KeyValueList, { props: { items: ITEMS } });
		expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
			'Τι',
			'Πού',
			'Πότε'
		]);
		expect(screen.getAllByRole('definition').map((value) => value.textContent?.trim())).toEqual([
			'Οποιαδήποτε κατηγορία',
			'Αθήνα',
			'Οποτεδήποτε'
		]);
	});

	it('U-03.1 (negative): without a title no title line; no items, an empty list; no id the caller did not give', () => {
		const { container } = render(KeyValueList, { props: { items: [] } });
		const card = container.querySelector('[data-slot="key-value-list"]') as HTMLElement;
		expect(card.children).toHaveLength(1);
		expect(card.querySelector('dl')?.children).toHaveLength(0);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens', () => {
		const { container } = render(KeyValueList, { props: { items: ITEMS, title: 'Κριτήρια' } });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
