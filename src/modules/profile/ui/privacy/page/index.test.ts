import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Privacy from './index.svelte';

/*
 * Wave 4.5 · screen 62 «Απόρρητο» (record §5.7, U-173; D-W45-27 … D-W45-29): the group «Απόρρητο δεδομένων», its three
 * card-rows and the box. The page is drawn inside the shell's section, which owns its title.
 */

const links = {
	rights: '/legal/privacy-policy',
	policy: '/legal/privacy-policy',
	tools: '/profile/third-party-tools',
	deletion: '/profile/account-settings/deletion'
};

const draw = (props: { member?: boolean; toolsLine?: string | null; locale?: 'el' | 'en' } = {}) =>
	render(Privacy, {
		props: {
			locale: props.locale ?? 'el',
			member: props.member ?? true,
			links,
			toolsLine: props.toolsLine === undefined ? 'Μόνο τα απαραίτητα' : props.toolsLine
		}
	});

const cards = () =>
	[...screen.getByTestId('privacy-page').querySelectorAll('ul a')].map((card) =>
		card.getAttribute('data-testid')
	);

describe('profile/ui/privacy · «Απόρρητο» (wave 4.5, screen 62)', () => {
	it('U-140: a MEMBER reads «Απόρρητο δεδομένων», the three card-rows in their order and the box — every word as the approved prototype writes it', () => {
		draw();
		const page = screen.getByTestId('privacy-page');
		expect(
			within(page).getByRole('heading', { level: 3, name: 'Απόρρητο δεδομένων' })
		).toBeInTheDocument();
		expect(cards()).toEqual(['privacy-data', 'privacy-tools', 'privacy-deletion']);
		expect(screen.getByTestId('privacy-data')).toHaveTextContent('Τα προσωπικά σας δεδομένα');
		expect(screen.getByTestId('privacy-data-line')).toHaveTextContent(
			'Πώς ζητάτε αντίγραφο, διόρθωση ή διαγραφή των στοιχείων σας'
		);
		expect(screen.getByTestId('privacy-tools')).toHaveTextContent('Εργαλεία τρίτων και cookies');
		expect(screen.getByTestId('privacy-deletion')).toHaveTextContent('Διαγραφή λογαριασμού');
		expect(screen.getByTestId('privacy-deletion-line')).toHaveTextContent(
			'Οριστική διαγραφή του λογαριασμού και των στοιχείων σας'
		);
		const box = screen.getByTestId('privacy-box');
		expect(box).toHaveTextContent('Προστατεύουμε τα δεδομένα σας');
		expect(box.textContent?.replace(/\s+/gu, ' ')).toContain(
			'Διαβάστε πώς τα συλλέγουμε και τα χρησιμοποιούμε στην Πολιτική απορρήτου.'
		);
	});

	it('each card is a link with «›», 48 high at least: the policy, the tools’ page, the deletion’s first step; the box’s link is the policy', () => {
		draw();
		expect(screen.getByTestId('privacy-data')).toHaveAttribute('href', '/legal/privacy-policy');
		expect(screen.getByTestId('privacy-tools')).toHaveAttribute(
			'href',
			'/profile/third-party-tools'
		);
		expect(screen.getByTestId('privacy-deletion')).toHaveAttribute(
			'href',
			'/profile/account-settings/deletion'
		);
		for (const id of ['privacy-data', 'privacy-tools', 'privacy-deletion']) {
			const card = screen.getByTestId(id);
			expect(card.tagName).toBe('A');
			expect(card).toHaveClass('min-h-touch', 'rounded-md', 'border-line-2');
			expect(card.querySelector('[data-icon="chevron-forward"]')).not.toBeNull();
		}
		const policy = screen.getByTestId('privacy-policy-link');
		expect(policy).toHaveAttribute('href', '/legal/privacy-policy');
		expect(policy).toHaveTextContent('Πολιτική απορρήτου');
	});

	it('🔴 D-W45-29: a GUEST reads the first two cards and the box — «Διαγραφή λογαριασμού» is not there, nor any word of it', () => {
		draw({ member: false });
		expect(cards()).toEqual(['privacy-data', 'privacy-tools']);
		expect(screen.queryByTestId('privacy-deletion')).toBeNull();
		expect(screen.getByTestId('privacy-page')).not.toHaveTextContent(
			/Διαγραφή λογαριασμού|Οριστική/u
		);
		expect(screen.getByTestId('privacy-box')).toBeInTheDocument();
		expect(screen.getByTestId('privacy-policy-link')).toBeInTheDocument();
	});

	it.each([
		'Μόνο τα απαραίτητα',
		'Απαραίτητα, Στατιστικά',
		'Απαραίτητα, Λειτουργικά, Στατιστικά, Στόχευση και διαφήμιση'
	])(
		'🔴 D-W45-28: the tools’ row says what is open, as it is handed — «%s» — for a member and a guest',
		(line) => {
			for (const member of [true, false]) {
				const view = draw({ member, toolsLine: line });
				expect(screen.getByTestId('privacy-tools-line')).toHaveTextContent(line);
				view.unmount();
			}
		}
	);

	it('D-W45-28 (negative): until the line can be said the row waits in place — it never guesses, and it is still a link', () => {
		draw({ toolsLine: null });
		expect(screen.queryByTestId('privacy-tools-line')).toBeNull();
		expect(screen.getByTestId('privacy-tools-line-loading')).toHaveAttribute('aria-hidden', 'true');
		expect(screen.getByTestId('privacy-tools')).toHaveAttribute(
			'href',
			'/profile/third-party-tools'
		);
		expect(screen.getByTestId('privacy-tools')).not.toHaveTextContent(/απαραίτητα/iu);
	});

	it('🔴 D-W45-27 (negative): the controller’s contact is never written on the page — no address, no mailto', () => {
		draw();
		const page = screen.getByTestId('privacy-page');
		expect(page.textContent).not.toMatch(/@|mailto/u);
		expect(page.querySelector('a[href^="mailto:"]')).toBeNull();
	});

	it('🔴 U-65.6 (negative): the line handed to the tools’ row is drawn as text — markup stays letters', () => {
		const markup = '<img src=x onerror=alert(1)>';
		draw({ toolsLine: markup });
		expect(screen.getByTestId('privacy-page').querySelector('img')).toBeNull();
		expect(screen.getByTestId('privacy-tools-line')).toHaveTextContent(markup);
	});

	it('the same page in English', () => {
		draw({ locale: 'en', toolsLine: 'Only the essential ones' });
		expect(screen.getByRole('heading', { level: 3, name: 'Data privacy' })).toBeInTheDocument();
		expect(screen.getByTestId('privacy-data')).toHaveTextContent('Your personal data');
		expect(screen.getByTestId('privacy-data-line')).toHaveTextContent(
			'How to request a copy, a correction or the deletion of your data'
		);
		expect(screen.getByTestId('privacy-tools')).toHaveTextContent('Third-party tools and cookies');
		expect(screen.getByTestId('privacy-deletion')).toHaveTextContent('Delete account');
		expect(screen.getByTestId('privacy-deletion-line')).toHaveTextContent(
			'Permanently delete your account and your details'
		);
		expect(screen.getByTestId('privacy-box').textContent?.replace(/\s+/gu, ' ')).toContain(
			'We protect your data Read how we collect and use it in the Privacy policy.'
		);
	});
});
