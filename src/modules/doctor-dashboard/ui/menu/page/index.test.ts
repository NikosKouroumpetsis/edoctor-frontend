import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { DoctorStanding } from '$shared/state/doctor-standing';
import { NotificationBadge } from '$shared/state/notification-badge';
import { Session } from '$shared/state/session';
import Harness from './menu.harness.svelte';

function drawMenu({ fresh = 0, bell = false, signOut = vi.fn(async () => undefined) } = {}) {
	const switchTo = vi.fn(async () => true);
	render(Harness, {
		props: {
			session: new Session({
				status: () => 'member',
				member: () => ({ firstName: 'Ελένη' }),
				signOut
			}),
			standing: new DoctorStanding({
				facts: () => ({
					kind: 'doctor',
					notice: null,
					lastMode: 'DOCTOR',
					card: { firstName: 'Ελένη', lastName: 'Παππά', specialtyName: 'Καρδιολόγος' }
				}),
				switchTo
			}),
			notifications: new NotificationBadge({ count: () => fresh }),
			bell
		}
	});
	return { switchTo, signOut };
}

describe('«Μενού» of the doctor as 5.1 ships it on the web (D-W51-04, screen 76)', () => {
	it('U-164.1: the name card with the specialty of the catalogue — never pressed', () => {
		drawMenu();
		expect(screen.getByRole('heading', { level: 1, name: 'Μενού' })).toBeInTheDocument();
		expect(screen.getByTestId('doctor-menu-name')).toHaveTextContent('Ελένη Παππά');
		expect(screen.getByTestId('doctor-menu-name-line')).toHaveTextContent('Καρδιολόγος');
		expect(screen.getByTestId('doctor-menu-name-card').closest('a, button')).toBeNull();
	});

	// Round 2 (U-81.2, `76-menu` m-51): the page's rows are the «Προφίλ»'s at 402 — no «Ειδοποιήσεις» (the bell at the
	// title has it), «Βρείτε βοήθεια» for the help; the ☰ from 744 keeps both (the frame's tests).
	// Rewritten by D-W52-22 (wave 5.2, card w52-w1; task doc §6): «Το προφίλ μου» is the first row, a link to screen 77.
	// Widened by D-W52-91 (wave 5.2, card w52-w8; task doc §1.3): «Κριτικές», a link to screen 84, after «Οι ασθενείς μου».
	// Widened by D-W52-102 (wave 5.2, card w52-w9): «Τα άρθρα μου», a link to screen 85, after «Κριτικές».
	it('D-W51-04 · round 2 · 🔴 D-W52-22 · D-W52-91 · D-W52-102: the rows — Το προφίλ μου · Οι ασθενείς μου · Κριτικές · Τα άρθρα μου · Ρυθμίσεις λογαριασμού · Βρείτε βοήθεια · Όροι γιατρών · Αποσύνδεση; U-186.2 (negative): no «Οι συγγενείς μου», no «Ρυθμίσεις ιατρείου», no row «Ειδοποιήσεις»', () => {
		drawMenu();
		const page = screen.getByTestId('doctor-menu');
		expect(
			[...page.querySelectorAll('[data-slot="menu-row"]')].map((row) => [
				row.textContent?.trim(),
				row.getAttribute('href')
			])
		).toEqual([
			['Το προφίλ μου', '/doctor/profile'],
			// D-W51-73 (card w51-w9): «Οι ασθενείς μου», since step 9 (D-W51-04).
			['Οι ασθενείς μου', '/doctor/patients'],
			['Κριτικές', '/doctor/reviews'],
			['Τα άρθρα μου', '/doctor/articles'],
			['Ρυθμίσεις λογαριασμού', '/profile/account-settings'],
			['Βρείτε βοήθεια', '/help'],
			['Όροι γιατρών', '/legal/doctor-marketplace-terms'],
			['Αποσύνδεση', null]
		]);
		expect(page).not.toHaveTextContent(/συγγενείς|Ρυθμίσεις ιατρείου|Ταμείο/u);
		// U-186.2: the one row with the word — its first group's first row; the name card above it is never pressed.
		const first = within(screen.getByTestId('doctor-menu-group-0')).getAllByRole('link')[0];
		expect(first).toHaveAttribute('data-testid', 'doctor-menu-profile');
		expect(first).toHaveTextContent('Το προφίλ μου');
	});

	it('round 2: «Μενού» and, at the end of its title row, what the screen hands in (the bell of screen 63)', () => {
		drawMenu({ fresh: 2, bell: true });
		const title = screen.getByRole('heading', { level: 1, name: 'Μενού' });
		expect(title.parentElement).toContainElement(screen.getByTestId('handed-bell'));
		expect(screen.queryByRole('link', { name: /Ειδοποιήσεις/u })).toBeNull();
	});

	it('the pill «Λειτουργία ασθενή» (below 744) switches; «Αποσύνδεση» signs out once', async () => {
		const user = userEvent.setup();
		const { switchTo, signOut } = drawMenu();
		const pill = screen.getByTestId('doctor-menu-patient-mode');
		expect(pill).toHaveTextContent('Λειτουργία ασθενή');
		expect(pill.className).toMatch(/\btablet:hidden\b/u);
		await user.click(pill);
		expect(switchTo).toHaveBeenCalledWith('PATIENT');
		await user.click(screen.getByTestId('doctor-menu-sign-out'));
		expect(signOut).toHaveBeenCalledTimes(1);
	});
});
