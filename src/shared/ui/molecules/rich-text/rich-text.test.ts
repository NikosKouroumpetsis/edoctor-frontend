import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { buildArticleRichText } from '$shared/lib/rich-text';
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

describe('RichText · an article of the closed schema (D-W52-104)', () => {
	const IMAGE = '0199aaaa-0000-7000-8000-000000000001';
	const blocks = buildArticleRichText(
		{
			type: 'doc',
			content: [
				{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Υπότιτλος' }] },
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Υ', marks: [{ type: 'underline' }] },
						{ type: 'text', text: 'Δ', marks: [{ type: 'strike' }] },
						{ type: 'text', text: 'Ε', marks: [{ type: 'highlight' }] },
						{ type: 'hardBreak' },
						{
							type: 'text',
							text: 'ΕΟΔΥ',
							marks: [{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }]
						}
					]
				},
				{
					type: 'orderedList',
					attrs: { start: 2, type: null },
					content: [
						{
							type: 'listItem',
							content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Δεύτερο' }] }]
						}
					]
				},
				{
					type: 'blockquote',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Παράθεμα' }] }]
				},
				{
					type: 'callout',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Καλέστε το 166.' }] }]
				},
				{ type: 'horizontalRule' },
				{
					type: 'image',
					attrs: { imageId: IMAGE, alt: 'Πιεσόμετρο', caption: 'Το χέρι στο τραπέζι.' }
				},
				{ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } },
				{
					type: 'table',
					content: [
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableHeader',
									content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Κατηγορία' }] }]
								}
							]
						},
						{
							type: 'tableRow',
							content: [
								{
									type: 'tableCell',
									content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Αυξημένη' }] }]
								}
							]
						}
					]
				}
			]
		},
		(id) =>
			id === IMAGE ? { url: 'https://cdn.example.org/l.webp', width: 1200, height: 800 } : null
	).blocks;

	it('🔴 D-W52-104: every node and mark has its own element — h3, u, s, mark, br, ol start, blockquote, aside, hr, figure, table', () => {
		const { container } = render(RichText, {
			props: { blocks, variant: 'article', userContent: true, testId: 'body' }
		});
		const body = screen.getByTestId('body');
		expect(body.querySelector('h3')).toHaveTextContent('Υπότιτλος');
		expect(body.querySelector('u')).toHaveTextContent('Υ');
		expect(body.querySelector('s')).toHaveTextContent('Δ');
		expect(body.querySelector('mark')).toHaveTextContent('Ε');
		expect(body.querySelector('br')).not.toBeNull();
		expect(body.querySelector('ol')).toHaveAttribute('start', '2');
		expect(body.querySelector('blockquote')).toHaveTextContent('Παράθεμα');
		expect(body.querySelector('aside')).toHaveTextContent('Καλέστε το 166.');
		expect(body.querySelector('hr')).not.toBeNull();
		const image = body.querySelector('figure img');
		expect(image).toHaveAttribute('src', 'https://cdn.example.org/l.webp');
		expect(image).toHaveAttribute('alt', 'Πιεσόμετρο');
		expect(image).toHaveAttribute('width', '1200');
		expect(body.querySelector('figcaption')).toHaveTextContent('Το χέρι στο τραπέζι.');
		expect(body.querySelector('th')).toHaveTextContent('Κατηγορία');
		expect(body.querySelector('td')).toHaveTextContent('Αυξημένη');
		expect(container.querySelector('script')).toBeNull();
	});

	it('wave 5.2 · screen 85 (`64-switch/sw.css:668` `.w-arpic`): a picture that does not load leaves its 16:9 place with the glyph — never a broken image, never its words in a band; the caption stays', async () => {
		render(RichText, { props: { blocks, variant: 'article', userContent: true, testId: 'body' } });
		const body = screen.getByTestId('body');
		await fireEvent.error(body.querySelector('figure img') as HTMLImageElement);
		expect(body.querySelector('figure img')).toBeNull();
		const place = body.querySelector('[data-slot="rich-text-image-missing"]');
		expect(place).toHaveAttribute('role', 'img');
		expect(place).toHaveAccessibleName('Πιεσόμετρο');
		expect(place).toHaveClass('aspect-video', 'max-h-figure-max', 'bg-muted', 'text-line-2');
		expect(place).not.toHaveTextContent('Πιεσόμετρο');
		expect(place?.querySelector('svg[data-slot="picture"]')).not.toBeNull();
		expect(body.querySelector('figcaption')).toHaveTextContent('Το χέρι στο τραπέζι.');
	});

	it('🔴 D-W52-104 (U-222.4): a link of the doctor opens in a new tab with `rel="nofollow ugc noopener noreferrer"`', () => {
		render(RichText, { props: { blocks, variant: 'article', userContent: true } });
		const link = screen.getByRole('link', { name: 'ΕΟΔΥ' });
		expect(link).toHaveAttribute('href', 'https://eody.gov.gr/');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'nofollow ugc noopener noreferrer');
	});

	it('🔴 D-W52-104 (U-222.4): a video loads ONLY when pressed — before, no frame at all; after, ONE sandboxed frame from YouTube without cookies', async () => {
		const { container } = render(RichText, { props: { blocks, variant: 'article' } });
		expect(container.querySelector('iframe')).toBeNull();
		await fireEvent.click(screen.getByTestId('rich-text-video-play'));
		const frame = screen.getByTestId('rich-text-video-frame');
		expect(frame).toHaveAttribute(
			'src',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0'
		);
		expect(frame).toHaveAttribute(
			'sandbox',
			'allow-scripts allow-same-origin allow-presentation allow-popups'
		);
		expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
		expect(container.querySelectorAll('iframe')).toHaveLength(1);
	});

	it('live check 85 (19/11, `64-switch/sw.css:669` `.w-arplay`): the video’s place is the dark surface in both themes — never the inverting foreground', () => {
		const { container } = render(RichText, { props: { blocks, variant: 'article' } });
		const place = container.querySelector('[data-slot="rich-text-video-place"]');
		expect(place).toHaveClass('bg-secondary', 'text-secondary-foreground');
		expect(place).not.toHaveClass('bg-foreground');
	});
});
