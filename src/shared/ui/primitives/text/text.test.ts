import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Text from './text.svelte';
import { textVariants } from './index';

describe('Text', () => {
	it('U-03.9: draws each role of the application, class for class', () => {
		for (const variant of ['title', 'heading', 'body', 'caption', 'eyebrow'] as const) {
			const view = render(Text, { props: { variant, text: variant } });
			const node = view.container.querySelector('[data-slot="text"]') as HTMLElement;
			for (const name of textVariants[variant].split(' ')) expect(node, variant).toHaveClass(name);
			view.unmount();
		}
	});

	it('U-03.9: is body when nothing names a role, and no role when the class names one', () => {
		const plain = render(Text, { props: { text: 'Κείμενο' } });
		expect(screen.getByText('Κείμενο')).toHaveClass(
			'text-body-lg',
			'leading-relaxed',
			'text-foreground/80'
		);
		plain.unmount();
		render(Text, { props: { text: 'Τίτλος', class: 'text-title-sm text-foreground' } });
		expect(screen.getByText('Τίτλος')).toHaveClass('text-title-sm');
		expect(screen.getByText('Τίτλος')).not.toHaveClass('text-body-lg');
	});

	it('U-03.9: the tag is the meaning, the role is the look', () => {
		render(Text, { props: { as: 'h1', variant: 'heading', text: 'Αναζήτηση' } });
		expect(screen.getByRole('heading', { level: 1, name: 'Αναζήτηση' })).toHaveClass(
			'text-heading-xl'
		);
	});

	it('U-03.9: an eyebrow writes Greek capitals without tonos and keeps the accents for the ear', () => {
		const { container } = render(Text, { props: { variant: 'eyebrow', text: 'Νέα άρθρα' } });
		const shown = container.querySelector('[aria-hidden="true"]') as HTMLElement;
		expect(shown).toHaveTextContent('ΝΕΑ ΑΡΘΡΑ');
		expect(container.querySelector('.sr-only')).toHaveTextContent('Νέα άρθρα');
	});

	it('U-03.9: English stays as written (the uppercase class draws it)', () => {
		const { container } = render(Text, { props: { variant: 'eyebrow', text: 'New articles' } });
		expect(container.querySelector('[data-slot="text"]')).toHaveTextContent('New articles');
		expect(container.querySelector('.sr-only')).toBeNull();
	});

	// U-06.2 (the orchestrator's 375 measurement): a word wider than the line ran out of the box; the application's
	// text breaks it. `overflow-wrap: break-word` breaks only such a word, on every role and with the caller's class.
	it('U-06.2: a word wider than its line breaks (overflow-wrap), with a role or a class of its own', () => {
		const role = render(Text, { props: { text: 'προτεραιότητα', variant: 'title' } });
		expect(role.container.querySelector('[data-slot="text"]')).toHaveClass('wrap-break-word');
		role.unmount();
		const own = render(Text, {
			props: { text: 'Η υγεία σου, πρώτη προτεραιότητα', class: 'text-display-xl text-foreground' }
		});
		const element = own.container.querySelector('[data-slot="text"]');
		expect(element).toHaveClass('wrap-break-word', 'text-display-xl');
		expect(element).not.toHaveClass('break-all');
	});
});
