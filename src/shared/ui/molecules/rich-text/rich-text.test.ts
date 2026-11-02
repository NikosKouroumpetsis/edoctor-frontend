import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { RichText } from './index';

const doc = {
	content: [
		{ type: 'heading', attrs: { level: 2, anchor: 'booking' }, text: 'Διαδικασία ραντεβού' },
		{
			type: 'paragraph',
			content: [
				{ type: 'text', text: 'Δείτε ' },
				{
					type: 'text',
					text: 'εδώ',
					marks: [{ type: 'link', attrs: { href: 'https://example.org' } }]
				},
				{ type: 'text', text: ', τους ' },
				{
					type: 'text',
					text: 'όρους',
					marks: [{ type: 'link', attrs: { href: '/legal/terms-of-use' } }]
				},
				{ type: 'text', text: ' ή ' },
				{
					type: 'text',
					text: 'αυτό',
					marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
				}
			]
		},
		{ type: 'paragraph', text: '<script>alert(1)</script>' },
		{ type: 'heading', attrs: { level: 3 }, text: 'Μια ερώτηση;' }
	]
};

describe('RichText', () => {
	it('common v2 §B (app = web): headings at their ids, the safe links drawn, an external one in a new tab', () => {
		render(RichText, {
			props: { document: doc, variant: 'article', internalHref: (path: string) => `/en${path}` }
		});
		expect(screen.getByRole('heading', { level: 2, name: 'Διαδικασία ραντεβού' })).toHaveAttribute(
			'id',
			'booking'
		);
		expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'μια-ερωτηση');
		const external = screen.getByRole('link', { name: 'εδώ' });
		expect(external).toHaveAttribute('target', '_blank');
		expect(external).toHaveAttribute('rel', 'noopener noreferrer');
		expect(screen.getByRole('link', { name: 'όρους' })).toHaveAttribute(
			'href',
			'/en/legal/terms-of-use'
		);
	});

	it('common v2 §B (negative): an unsafe link is its words alone, and markup in the words is never an element', () => {
		const { container } = render(RichText, { props: { document: doc } });
		expect(screen.queryByRole('link', { name: 'αυτό' })).not.toBeInTheDocument();
		expect(screen.getByText(/αυτό/u)).toBeInTheDocument();
		expect(container.querySelector('script')).toBeNull();
		expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
	});

	it('U-57.4 / U-59.1: the reading sizes — the article 18/28, a legal text 16/26 (the application’s below 744), an answer muted', () => {
		const { rerender, container } = render(RichText, {
			props: { document: doc, variant: 'article' }
		});
		const box = () => container.querySelector('[data-slot="rich-text"]');
		expect(box()).toHaveClass('text-article-body');
		rerender({ document: doc, variant: 'legal' });
		expect(box()).toHaveClass('text-body-lg', 'leading-relaxed', 'tablet:text-document-body');
		rerender({ document: doc, variant: 'answer' });
		expect(box()).toHaveClass('text-document-body', 'text-muted-foreground');
	});

	it('U-60.1 Π4: the folded words of a search are marked inside the runs — a link’s words too', () => {
		const { container } = render(RichText, {
			props: { document: doc, highlight: ['ορου', 'ραντεβου'] }
		});
		expect([...container.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual([
			'όρου'
		]);
		expect(container.querySelector('mark')?.closest('a')).toHaveAttribute(
			'href',
			'/legal/terms-of-use'
		);
	});

	it('U-59.4: the words keep their own language when it is not the page’s', () => {
		const { container } = render(RichText, { props: { document: doc, lang: 'el' } });
		expect(container.querySelector('[data-slot="rich-text"]')).toHaveAttribute('lang', 'el');
	});
});
