import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import InlineLinkText from './inline-link-text.svelte';

describe('InlineLinkText', () => {
	it('U-03.1: writes the sentence muted and the link inline at its end (M-41)', () => {
		const { container } = render(InlineLinkText, {
			props: { text: 'Θα σας στείλουμε κωδικό.', linkLabel: 'Πολιτική απορρήτου', href: '/privacy' }
		});
		const sentence = container.querySelector('[data-slot="inline-link-text"]') as HTMLElement;
		expect(sentence.tagName).toBe('P');
		expect(sentence).toHaveClass('text-body-sm', 'text-muted-foreground');
		const link = screen.getByRole('link', { name: 'Πολιτική απορρήτου' });
		expect(link).toHaveAttribute('href', '/privacy');
		expect(link).toHaveClass('text-body-sm', 'font-semibold', 'text-foreground', 'underline');
		expect(sentence).toContainElement(link);
		expect(sentence).toHaveTextContent('Θα σας στείλουμε κωδικό. Πολιτική απορρήτου');
	});

	it('U-03.1: without an href the link is an action in place', async () => {
		const user = userEvent.setup({ delay: null });
		const onLinkPress = vi.fn();
		render(InlineLinkText, { props: { text: 'Δείτε', linkLabel: 'τους όρους', onLinkPress } });
		await user.click(screen.getByRole('button', { name: 'τους όρους' }));
		expect(onLinkPress).toHaveBeenCalledOnce();
	});
});
