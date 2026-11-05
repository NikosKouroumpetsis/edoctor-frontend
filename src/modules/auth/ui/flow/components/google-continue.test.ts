import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';
import GoogleContinue from './google-continue.svelte';

describe('GoogleContinue', () => {
	afterEach(cleanup);

	it('Α14, U-100: Google’s colour G only on the white surface, centred with its title as Airbnb’s, 48 high at 16/500', () => {
		render(GoogleContinue, { props: { label: 'Συνέχεια με Google' } });
		const button = screen.getByRole('button', { name: 'Συνέχεια με Google' });
		expect(button).toHaveStyle({ backgroundColor: SIGN_IN_PROVIDER_COLORS.surface });
		expect(button).toHaveClass('min-h-control-md', 'rounded-md', 'justify-center');
		expect(button.className).not.toContain('bg-primary');
		const mark = screen.getByTestId('auth-google-continue-mark');
		expect(mark).toHaveClass('aspect-31/44', 'h-control-md');
		expect(mark.querySelector('svg')).not.toBeNull();
		const title = button.querySelector('[data-slot="auth-google-continue-title"]') as HTMLElement;
		expect(title).toHaveClass('text-body-lg', 'font-medium');
		expect(title).toHaveStyle({ color: SIGN_IN_PROVIDER_COLORS.mark });
		const outline = button.querySelector('span.absolute') as HTMLElement;
		expect(outline).toHaveClass('border', 'border-border', 'group-active:border-primary');
	});

	it('U-64.3: presses while idle; its sign-in on its way dims it and refuses the press', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const { rerender } = render(GoogleContinue, {
			props: { label: 'Συνέχεια με Google', onclick }
		});
		const button = screen.getByRole('button', { name: 'Συνέχεια με Google' });
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
		await rerender({ busy: true });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(button).toHaveClass('opacity-50');
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-65.6 (negative): the title is text', () => {
		const { container } = render(GoogleContinue, { props: { label: '<img src=x>' } });
		expect(container.querySelector('img')).toBeNull();
		expect(screen.getByRole('button')).toHaveTextContent('<img src=x>');
	});
});
