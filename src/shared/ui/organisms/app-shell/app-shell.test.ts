import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './app-shell.harness.svelte';

describe('AppShell', () => {
	it('U-03.8: lays out the caller’s header, content, footer and bottom bar, in that order', () => {
		const { container } = render(Harness);
		const shell = container.querySelector('[data-slot="app-shell"]') as HTMLElement;
		expect(shell).toHaveClass('flex', 'min-h-dvh', 'flex-col', 'bg-background');
		const parts = [...shell.children].map((child) => child.tagName);
		expect(parts).toEqual(['HEADER', 'DIV', 'FOOTER', 'NAV']);
		expect(screen.getByText('Περιεχόμενο σελίδας').parentElement).toHaveClass('flex-1');
	});

	it('U-03.8: a skip link, when named, is the first stop and points at the content', () => {
		render(Harness, { props: { skipLinkLabel: 'Μετάβαση στο περιεχόμενο' } });
		const skip = screen.getByRole('link', { name: 'Μετάβαση στο περιεχόμενο' });
		expect(skip).toHaveAttribute('href', '#content');
		expect(skip).toHaveClass('sr-only', 'focus:not-sr-only');
		expect(document.getElementById('content')).toHaveTextContent('Περιεχόμενο σελίδας');
	});
});
