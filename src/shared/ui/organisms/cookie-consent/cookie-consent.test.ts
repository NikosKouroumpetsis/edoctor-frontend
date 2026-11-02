import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { motion } from '$shared/design/tokens';
import CookieConsent from './cookie-consent.svelte';

const copy = {
	title: 'Σεβόμαστε το απόρρητό σας',
	description: 'Χρησιμοποιούμε cookies.',
	acceptLabel: 'Αποδοχή όλων',
	rejectLabel: 'Μόνο απαραίτητα',
	'aria-label': 'Συναίνεση cookies'
};

describe('CookieConsent', () => {
	it('U-03.8: every word comes from the caller; accept dismisses the card (after its leave)', async () => {
		const user = userEvent.setup();
		const onAccept = vi.fn();
		render(CookieConsent, { props: { ...copy, onAccept } });
		const region = screen.getByRole('region', { name: 'Συναίνεση cookies' });
		expect(region).toHaveTextContent('Σεβόμαστε το απόρρητό σας');
		await user.click(screen.getByRole('button', { name: 'Αποδοχή όλων' }));
		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(region).toHaveAttribute('data-state', 'closed');
		await waitFor(() =>
			expect(screen.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument()
		);
	});

	it('U-03.8: reject keeps the essentials only', async () => {
		const user = userEvent.setup();
		const onReject = vi.fn();
		render(CookieConsent, { props: { ...copy, onReject } });
		await user.click(screen.getByRole('button', { name: 'Μόνο απαραίτητα' }));
		expect(onReject).toHaveBeenCalledTimes(1);
	});

	// Rewrites the U-06.2 guard (two buttons, `flex-col` ⇒ `tablet:flex-row`): U-16.5 brings the third way, so the
	// three sit in a grid — still stacked full width on the phone (U-06.2's point), one row of three from 744.
	it('U-16.5: the three ways stack on the phone and form one row from 744; accept and reject share the dark look', () => {
		const { container } = render(CookieConsent, {
			props: { ...copy, manageLabel: 'Διαχείριση προτιμήσεων', onManage: () => {} }
		});
		const actions = container.querySelector('[data-slot="cookie-consent-actions"]');
		expect(actions).toHaveClass('grid', 'grid-cols-1', 'tablet:grid-cols-3');
		expect(actions).not.toHaveClass('flex-col', 'tablet:flex-row');
		for (const name of ['Αποδοχή όλων', 'Μόνο απαραίτητα']) {
			expect(screen.getByRole('button', { name })).toHaveClass('bg-secondary', 'rounded-sm');
		}
		expect(screen.getByRole('button', { name: 'Διαχείριση προτιμήσεων' })).toHaveAttribute(
			'data-slot',
			'text-button'
		);
	});

	it('U-16.5: the words carry their policy links in place; the third way only with its handler', async () => {
		const user = userEvent.setup();
		const onManage = vi.fn();
		const view = render(CookieConsent, {
			props: {
				...copy,
				description: [
					'Διαβάστε την ',
					{ label: 'Πολιτική cookies', href: '/legal/cookies-policy' },
					'.'
				],
				manageLabel: 'Διαχείριση προτιμήσεων',
				onManage
			}
		});
		const link = screen.getByRole('link', { name: 'Πολιτική cookies' });
		expect(link).toHaveAttribute('href', '/legal/cookies-policy');
		expect(link.parentElement).toHaveTextContent('Διαβάστε την Πολιτική cookies.');
		await user.click(screen.getByRole('button', { name: 'Διαχείριση προτιμήσεων' }));
		expect(onManage).toHaveBeenCalledOnce();
		expect(screen.getByRole('region', { name: 'Συναίνεση cookies' })).toBeInTheDocument();
		view.unmount();
		render(CookieConsent, { props: { ...copy, manageLabel: 'Διαχείριση προτιμήσεων' } });
		expect(
			screen.queryByRole('button', { name: 'Διαχείριση προτιμήσεων' })
		).not.toBeInTheDocument();
	});

	it('U-12/U-16.5: rises in and fades with CSS (starting: and the closed state) in Airbnb’s 0.4 s, no svelte/transition', () => {
		render(CookieConsent, { props: copy });
		expect(motion.duration.consent).toBe(400);
		expect(screen.getByRole('region')).toHaveClass(
			'starting:opacity-0',
			'starting:translate-y-3',
			'data-[state=closed]:opacity-0',
			'duration-consent',
			'ease-standard'
		);
	});
});
