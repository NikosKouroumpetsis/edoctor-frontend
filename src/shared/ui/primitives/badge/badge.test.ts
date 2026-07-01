import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Badge from './badge.svelte';

const label = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('Badge', () => {
	it('renders a span by default', () => {
		const { container } = render(Badge, { props: { children: label('New') } });
		const badge = container.querySelector('[data-slot="badge"]')!;
		expect(badge.tagName).toBe('SPAN');
		expect(badge).toHaveTextContent('New');
	});

	it('renders an anchor when href is provided', () => {
		render(Badge, { props: { href: '/x', children: label('Link') } });
		const link = screen.getByRole('link', { name: 'Link' });
		expect(link).toHaveAttribute('href', '/x');
	});

	it('defaults to the default size scale and applies sm/lg', () => {
		const def = render(Badge, { props: { children: label('A') } });
		expect(def.container.querySelector('[data-slot="badge"]')).toHaveClass('text-label-md', 'px-2');
		def.unmount();

		const sm = render(Badge, { props: { size: 'sm', children: label('B') } });
		expect(sm.container.querySelector('[data-slot="badge"]')).toHaveClass('text-label-sm');
		sm.unmount();

		const lg = render(Badge, { props: { size: 'lg', children: label('C') } });
		expect(lg.container.querySelector('[data-slot="badge"]')).toHaveClass('text-label-lg');
	});
});
