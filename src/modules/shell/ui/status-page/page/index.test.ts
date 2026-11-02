import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { invalidateAll } from '$app/navigation';
import SiteStatusPage from './index.svelte';

const href = (path: string) => path;

afterEach(() => {
	document.head.innerHTML = '';
});

describe('shell::ui::status-page', () => {
	it('U-61.1 (the prototype 09): a 404 — «Ωχ!», the sentence as the ONE h1, its code, «Ίσως σας βοηθήσουν:» and the pin', () => {
		render(SiteStatusPage, { props: { status: 404, locale: 'el', href } });
		const page = screen.getByTestId('site-status-page');
		expect(page).toHaveAttribute('data-status', '404');
		expect(within(page).getByText('Ωχ!')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(
			screen.getByRole('heading', { level: 1, name: 'Δεν βρίσκουμε τη σελίδα που ψάχνετε.' })
		).toBeInTheDocument();
		expect(within(page).getByText('Κωδικός σφάλματος: 404')).toBeInTheDocument();
		const links = within(page).getByRole('navigation', { name: 'Ίσως σας βοηθήσουν:' });
		expect(
			within(links)
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toContain('/');
		expect(page.querySelector('[data-slot="status-art"]')).toHaveAttribute('data-art', 'pin');
	});

	it('U-61.1 (negative): an error page is never indexed and names itself in the tab', () => {
		render(SiteStatusPage, { props: { status: 404, locale: 'el', href } });
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
		expect(document.title).toBe('Η σελίδα δεν βρέθηκε | eDoctor');
	});

	it('U-61.2: a failure is «Δοκιμάστε ξανά» (the page’s loads again) and the plug; never a code-less dead end', () => {
		render(SiteStatusPage, { props: { status: 503, locale: 'el', href } });
		const [retry] = screen.getAllByTestId('site-status-retry');
		expect(retry).toHaveTextContent('Δοκιμάστε ξανά');
		retry.click();
		expect(vi.mocked(invalidateAll)).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Κωδικός σφάλματος: 503')).toBeInTheDocument();
		expect(
			screen.getByTestId('site-status-page').querySelector('[data-slot="status-art"]')
		).toHaveAttribute('data-art', 'plug');
	});

	it('U-61.2 (negative): «Δοκιμή ξανά» is gone from the page — the one wording is «Δοκιμάστε ξανά»', () => {
		render(SiteStatusPage, { props: { status: 500, locale: 'el', href } });
		expect(screen.queryByText(/Δοκιμή ξανά/u)).not.toBeInTheDocument();
	});
});
