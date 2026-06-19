import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CookieConsent from './cookie-consent.svelte';

describe('CookieConsent', () => {
	it('accepts and dismisses the banner', async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		render(CookieConsent, { props: { onAccept } });
		expect(screen.getByRole('region', { name: 'Cookie consent' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Accept all' }));
		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
	});

	it('rejects to essentials only', async () => {
		const user = userEvent.setup();
		const onReject = vi.fn();
		render(CookieConsent, { props: { onReject } });
		await user.click(screen.getByRole('button', { name: 'Essentials only' }));
		expect(onReject).toHaveBeenCalledTimes(1);
	});
});
