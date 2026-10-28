import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TextButton from './text-button.svelte';

const labelOf = (target: HTMLElement) => target.querySelector('span') as HTMLElement;

describe('TextButton', () => {
	it('U-03.1: is a 48 target whose label is the caption: semibold body-sm muted', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(TextButton, { props: { label: 'Δείτε όλους', onclick } });
		const button = screen.getByRole('button', { name: 'Δείτε όλους' });
		expect(button).toHaveClass('min-h-touch', 'min-w-touch');
		expect(labelOf(button)).toHaveClass('font-semibold', 'text-body-sm', 'text-muted-foreground');
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1: each tone has ONE colour; a named role turns the default foreground (S-32.19)', () => {
		const looks = {
			foreground: 'text-foreground',
			primary: 'text-primary-text',
			muted: 'text-muted-foreground',
			danger: 'text-danger-text'
		} as const;
		for (const [tone, colour] of Object.entries(looks)) {
			const view = render(TextButton, { props: { label: tone, tone: tone as keyof typeof looks } });
			expect(labelOf(screen.getByRole('button', { name: tone }))).toHaveClass(colour);
			view.unmount();
		}
		render(TextButton, { props: { label: 'Ρόλος', textClass: 'text-label-md', underline: true } });
		const label = labelOf(screen.getByRole('button', { name: 'Ρόλος' }));
		expect(label).toHaveClass('text-label-md', 'text-foreground', 'underline');
		expect(label).not.toHaveClass('text-body-sm');
	});

	it('U-03.1: an href makes it a link', () => {
		render(TextButton, { props: { label: 'Όροι', href: '/terms' } });
		expect(screen.getByRole('link', { name: 'Όροι' })).toHaveAttribute('href', '/terms');
	});
});
