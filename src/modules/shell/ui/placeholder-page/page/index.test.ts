import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { page } from '$app/state';
import PlaceholderPage from './index.svelte';

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => {
	visit('/');
});

const props = { eyebrow: 'Σύντομα', title: 'Κλινικές', body: 'Η σελίδα ετοιμάζεται.' };

describe('PlaceholderPage', () => {
	it('names the tab after the page and the brand, and leads back to the Greek home page', () => {
		visit('/clinics');
		render(PlaceholderPage, props);

		expect(screen.getByRole('heading', { level: 1, name: 'Κλινικές' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Πίσω στην αρχική' })).toHaveAttribute('href', '/');
		expect(document.title).toBe('Κλινικές | eDoctor');
	});

	it('leads back to the English home page from an English page', () => {
		visit('/en/clinics');
		render(PlaceholderPage, { ...props, title: 'Clinics' });

		expect(screen.getByRole('link', { name: 'Back home' })).toHaveAttribute(
			'href',
			expect.stringMatching(/^\/en\/?$/)
		);
	});
});
