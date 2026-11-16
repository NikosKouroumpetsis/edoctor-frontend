import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import NameCard from './name-card.svelte';

describe('NameCard (screens 56, 76)', () => {
	it('the initial, the name and its line, each by the caller’s id; never pressed (U-164.1)', () => {
		render(NameCard, {
			props: { initial: 'Ε', title: 'Ελένη Παππά', line: 'Καρδιολόγος', testId: 'doc' }
		});
		expect(screen.getByTestId('doc-initial')).toHaveTextContent('Ε');
		expect(screen.getByTestId('doc')).toHaveTextContent('Ελένη Παππά');
		expect(screen.getByTestId('doc-line')).toHaveTextContent('Καρδιολόγος');
		const card = screen.getByTestId('doc-card');
		expect(card.tagName).toBe('DIV');
		expect(card.querySelector('a, button')).toBeNull();
	});

	it('no name known: the glyph alone; (negative) words are text, never markup', () => {
		const empty = render(NameCard, { props: { initial: null, title: null, line: null } });
		expect(screen.queryByTestId('name')).toBeNull();
		expect(screen.getByTestId('name-initial').querySelector('svg')).not.toBeNull();
		empty.unmount();
		render(NameCard, { props: { initial: 'Α', title: '<img src=x>', line: null } });
		expect(screen.getByTestId('name')).toHaveTextContent('<img src=x>');
		expect(screen.getByTestId('name-card').querySelector('img')).toBeNull();
	});
});
