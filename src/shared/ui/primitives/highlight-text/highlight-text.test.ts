import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HighlightText from './highlight-text.svelte';
import { buildHighlightSegments } from './index';

const matches = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-slot="highlight-text-match"]')].map(
		(match) => match.textContent
	);

describe('HighlightText', () => {
	it('U-03.1 (K4.4, M-36): the matched part is bold, the label keeps its accents and case', () => {
		const { container } = render(HighlightText, {
			props: { text: 'Αθήνα', query: 'αθη', class: 'text-body-sm font-medium text-foreground' }
		});
		const root = container.querySelector('[data-slot="highlight-text"]') as HTMLElement;
		expect(root).toHaveTextContent('Αθήνα');
		expect(root).toHaveClass('text-body-sm', 'font-medium', 'text-foreground');
		expect(matches(container)).toEqual(['Αθή']);
		expect(container.querySelector('[data-slot="highlight-text-match"]')).toHaveClass('font-bold');
	});

	it('U-03.1 (K4.4): every occurrence, case and accent insensitive, in the caller’s highlight class', () => {
		const { container } = render(HighlightText, {
			props: { text: 'Dr. Papa Papadopoulou', query: 'PAPA', highlightClass: 'font-semibold' }
		});
		expect(matches(container)).toEqual(['Papa', 'Papa']);
		expect(container.querySelector('[data-slot="highlight-text-match"]')).toHaveClass(
			'font-semibold'
		);
	});

	it('U-03.1 (negative): an empty query or one the visible words do not hold draws the plain words', () => {
		const none = render(HighlightText, { props: { text: 'Κηφισιά', query: 'ξξξ' } });
		expect(matches(none.container)).toEqual([]);
		expect(screen.getByText('Κηφισιά')).toBeInTheDocument();
		none.unmount();
		const blank = render(HighlightText, { props: { text: 'Κηφισιά', query: '   ' } });
		expect(matches(blank.container)).toEqual([]);
	});

	it('U-03.1 (a11y): one run of words — the reader hears the label once, not in pieces', () => {
		const { container } = render(HighlightText, {
			props: { text: 'Παθολόγος', query: 'παθ', lines: 1, testId: 'label' }
		});
		expect(screen.getByTestId('label')).toHaveTextContent('Παθολόγος');
		expect(screen.getByTestId('label')).toHaveClass('line-clamp-1');
		expect(container.querySelector('[aria-hidden]')).toBeNull();
	});

	it('maps a folded match back to the original slice (a precomposed accent never shifts it)', () => {
		expect(buildHighlightSegments('Ελλάδα', 'λαδ')).toEqual([
			{ highlighted: false, text: 'Ελ' },
			{ highlighted: true, text: 'λάδ' },
			{ highlighted: false, text: 'α' }
		]);
		expect(buildHighlightSegments('', 'α')).toEqual([{ highlighted: false, text: '' }]);
	});
});
