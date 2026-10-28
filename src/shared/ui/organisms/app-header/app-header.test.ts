import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import AppHeader from './app-header.svelte';

const part = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('AppHeader', () => {
	it('U-03.8: is the sticky size-container bar: brand, navigation, then the actions at the end', () => {
		render(AppHeader, {
			props: {
				brand: part('<a href="/">Αρχική</a>'),
				nav: part('<nav aria-label="Κύρια">Σύνδεσμοι</nav>'),
				actions: part('<button>Σύνδεση</button>')
			}
		});
		const header = screen.getByRole('banner');
		expect(header).toHaveClass('@container', 'sticky', 'top-0', 'z-50', 'border-b');
		const bar = header.firstElementChild as HTMLElement;
		expect(bar).toHaveClass('container-page', 'h-bar-top');
		expect(screen.getByRole('button', { name: 'Σύνδεση' }).parentElement).toHaveClass('ml-auto');
		expect(screen.getByRole('navigation', { name: 'Κύρια' })).toBeInTheDocument();
	});
});
