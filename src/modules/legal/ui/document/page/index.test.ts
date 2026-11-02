import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import type { LegalDocumentFacts } from '$modules/legal/api/page';
import type { LegalDocumentProps } from '../types';
import LegalDocument from './index.svelte';

const facts = (overrides: Partial<LegalDocumentFacts> = {}): LegalDocumentFacts => ({
	body: {
		content: [
			{ type: 'heading', attrs: { level: 2 }, text: 'Ο λογαριασμός σας' },
			{ type: 'paragraph', text: 'Κείμενο.' },
			{ type: 'heading', attrs: { level: 2 }, text: 'Ραντεβού και ακυρώσεις' },
			{ type: 'paragraph', text: 'Κι άλλο κείμενο.' }
		]
	},
	effectiveAt: '2026-07-01T00:00:00.000Z',
	slug: 'terms-of-use',
	title: 'Όροι χρήσης',
	upcoming: null,
	updatedAt: null,
	version: '1.0.1',
	language: 'el',
	metaTitle: null,
	metaDescription: null,
	canonicalUrl: null,
	...overrides
});

const props = (overrides: Partial<LegalDocumentProps> = {}): LegalDocumentProps => ({
	document: facts(),
	edition: undefined,
	locale: 'el',
	homeHref: '/',
	legalHref: '/legal',
	upcomingHref: '/legal/terms-of-use?edition=upcoming',
	currentHref: '/legal/terms-of-use',
	otherRows: [
		{ key: 'privacy-policy', label: 'Πολιτική απορρήτου', href: '/legal/privacy-policy' },
		{ key: 'delete-account', label: 'Διαγραφή λογαριασμού', href: '/account-deletion' }
	],
	internalHref: (path) => path,
	canonicalUrl: 'https://www.example.org/legal/terms-of-use',
	alternateUrls: {
		el: 'https://www.example.org/legal/terms-of-use',
		en: 'https://www.example.org/en/legal/terms-of-use'
	},
	...overrides
});

afterEach(() => {
	document.head.innerHTML = '';
});

describe('legal::ui::document', () => {
	it('U-59.1 Π1 / U-59.3 Ε2: «Αρχική › Νομικά › <τίτλος>», the «Νομικά» step the new `/legal` page; ONE h1', () => {
		render(LegalDocument, { props: props() });
		const crumbs = screen.getByRole('navigation', { name: 'Διαδρομή' });
		expect(within(crumbs).getByRole('link', { name: 'Αρχική' })).toHaveAttribute('href', '/');
		expect(within(crumbs).getByRole('link', { name: 'Νομικά' })).toHaveAttribute('href', '/legal');
		expect(within(crumbs).getByText('Όροι χρήσης')).toHaveAttribute('aria-current', 'page');
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByText('Έκδοση 1.0.1 · Ισχύει από 1 Ιουλίου 2026')).toBeInTheDocument();
	});

	it('U-59.2: a new version is the kit’s `Banner` info with its link to the announced text', () => {
		render(LegalDocument, {
			props: props({
				document: facts({
					upcoming: { version: '1.1.0', effectiveAt: '2026-12-02T00:00:00.000Z' }
				})
			})
		});
		const notice = screen.getByTestId('legal-edition-notice');
		expect(notice).toHaveAttribute('data-slot', 'banner');
		expect(notice).toHaveTextContent('Νέα έκδοση 1.1.0 — ισχύει από 2 Δεκεμβρίου 2026');
		expect(within(notice).getByRole('link', { name: 'Δείτε τη νέα έκδοση' })).toHaveAttribute(
			'href',
			'/legal/terms-of-use?edition=upcoming'
		);
	});

	it('U-59.3 Ε3 (negative): a legal text is never shared — no share button, no share window', () => {
		render(LegalDocument, { props: props() });
		expect(screen.queryByRole('button', { name: /Κοινοποίηση/u })).not.toBeInTheDocument();
		expect(document.querySelector('[data-slot="share"]')).toBeNull();
	});

	it('U-59.1 Π6: «Άλλα νομικά κείμενα» — the other texts and «Διαγραφή λογαριασμού»', () => {
		render(LegalDocument, { props: props() });
		const [others] = screen.getAllByTestId('legal-others');
		expect(within(others).getByRole('link', { name: /Διαγραφή λογαριασμού/u })).toHaveAttribute(
			'href',
			'/account-deletion'
		);
	});

	it('U-59.4: a Greek text on the English page keeps its own language and says so', () => {
		render(LegalDocument, { props: props({ locale: 'en' }) });
		expect(screen.getByTestId('legal-body')).toHaveAttribute('lang', 'el');
		expect(screen.getAllByText(/available in Greek only/u).length).toBeGreaterThan(0);
	});
});
