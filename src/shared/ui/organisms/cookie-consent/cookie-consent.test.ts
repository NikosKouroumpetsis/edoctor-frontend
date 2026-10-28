import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CookieConsent from './cookie-consent.svelte';

const copy = {
	title: 'Σεβόμαστε το απόρρητό σας',
	description: 'Χρησιμοποιούμε cookies.',
	acceptLabel: 'Αποδοχή όλων',
	rejectLabel: 'Μόνο τα απαραίτητα',
	'aria-label': 'Συναίνεση cookies'
};

describe('CookieConsent', () => {
	it('U-03.8: every word comes from the caller; accept dismisses the banner', async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		render(CookieConsent, { props: { ...copy, onAccept } });
		const region = screen.getByRole('region', { name: 'Συναίνεση cookies' });
		expect(region).toHaveTextContent('Σεβόμαστε το απόρρητό σας');
		await user.click(screen.getByRole('button', { name: 'Αποδοχή όλων' }));
		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument();
	});

	it('U-03.8: reject keeps the essentials only', async () => {
		const user = userEvent.setup();
		const onReject = vi.fn();
		render(CookieConsent, { props: { ...copy, onReject } });
		await user.click(screen.getByRole('button', { name: 'Μόνο τα απαραίτητα' }));
		expect(onReject).toHaveBeenCalledTimes(1);
	});

	// U-06.2: the two buttons sat in one row that never wrapped and ran 18 past the 375 card.
	it('U-06.2: the actions stack (full width) on the phone and form a row from 744', () => {
		const { container } = render(CookieConsent, { props: copy });
		const actions = container.querySelector('[data-slot="cookie-consent-actions"]');
		expect(actions).toHaveClass('flex', 'flex-col', 'tablet:flex-row');
		expect(actions).not.toHaveClass('flex-row');
	});
});
