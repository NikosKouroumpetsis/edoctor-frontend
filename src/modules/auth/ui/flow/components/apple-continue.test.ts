import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import AppleContinue from './apple-continue.svelte';

describe('AppleContinue', () => {
	afterEach(cleanup);

	it('U-64.3: presses while idle; its sign-in on its way dims it and refuses the press', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const { rerender } = render(AppleContinue, { props: { label: 'Συνέχεια με Apple', onclick } });
		const button = screen.getByRole('button', { name: 'Συνέχεια με Apple' });
		await user.click(button);
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(button).not.toHaveClass('opacity-50');

		await rerender({ busy: true });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(button).toHaveClass('opacity-50');
		await user.click(button);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('U-65.6 (negative): the title is text', () => {
		const { container } = render(AppleContinue, { props: { label: '<img src=x>' } });
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByRole('button')).toHaveTextContent('<img src=x>');
	});

	it('U-95: Apple’s file is hidden from assistive tech: the button is named by its title alone', () => {
		render(AppleContinue, { props: { label: 'Continue with Apple' } });
		const button = screen.getByRole('button', { name: 'Continue with Apple' });
		expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
	});
});
