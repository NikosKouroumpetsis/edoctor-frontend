import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { page } from '$app/state';
import SiteFooter from './site-footer.svelte';

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

afterEach(() => {
	visit('/');
});

describe('SiteFooter', () => {
	it('links the Greek account deletion page from the legal column', () => {
		render(SiteFooter);
		const link = screen.getByRole('link', { name: 'Διαγραφή λογαριασμού' });
		expect(link).toHaveAttribute('href', '/account-deletion');
	});

	it('links the English account deletion page under /en', () => {
		visit('/en/doctors');
		render(SiteFooter);
		const link = screen.getByRole('link', { name: 'Delete account' });
		expect(link).toHaveAttribute('href', '/en/account-deletion');
	});
});
