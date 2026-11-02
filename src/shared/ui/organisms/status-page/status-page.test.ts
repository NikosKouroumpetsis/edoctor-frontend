import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { StatusPage } from './index';

const props = {
	oops: 'Ωχ!',
	glyph: 'compass-outline' as const,
	title: 'Δεν βρίσκουμε τη σελίδα που ψάχνετε.',
	text: 'Ο σύνδεσμος μπορεί να είναι παλιός ή λανθασμένος.',
	codeLabel: 'Κωδικός σφάλματος: 404',
	linksTitle: 'Ίσως σας βοηθήσουν:',
	links: [
		{ label: 'Αρχική', href: '/' },
		{ label: 'Κέντρο βοήθειας', href: '/help' }
	],
	art: 'pin' as const,
	status: 404,
	testId: 'status'
};

describe('StatusPage', () => {
	it('U-61.1 (the prototype 09): ONE h1 — the sentence; «Ωχ!» decorative from 744; the code, «Ίσως σας βοηθήσουν:» and the links', () => {
		render(StatusPage, { props });
		expect(screen.getAllByRole('heading')).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(props.title);
		const oops = screen.getByText('Ωχ!');
		expect(oops).toHaveAttribute('aria-hidden', 'true');
		expect(oops).toHaveClass('hidden', 'tablet:block', 'text-display-xl');
		expect(screen.getByText('Κωδικός σφάλματος: 404')).toHaveClass('hidden', 'tablet:block');
		const nav = screen.getByRole('navigation', { name: 'Ίσως σας βοηθήσουν:' });
		expect(nav).toHaveClass('hidden', 'tablet:flex');
		expect(screen.getByRole('link', { name: 'Κέντρο βοήθειας' })).toHaveAttribute('href', '/help');
		expect(screen.getByTestId('status')).toHaveAttribute('data-status', '404');
	});

	it('U-61.1: our own picture, inline in the theme’s colours, hidden from assistive tech, from 744 only', () => {
		render(StatusPage, { props });
		const art = screen.getByTestId('status').querySelector('[data-slot="status-art"]');
		expect(art).toHaveAttribute('aria-hidden', 'true');
		expect(art).toHaveAttribute('data-art', 'pin');
		expect(art?.closest('[data-slot="status-page-art"]')).toHaveClass('hidden', 'tablet:flex');
		expect(art?.innerHTML).toContain('fill-primary');
		expect(art?.innerHTML).not.toMatch(/#[0-9a-f]{6}/iu);
	});

	it('U-61.1 / U-61.2 Ε2: the error’s buttons — the dark «Δοκιμάστε ξανά» presses, «Αρχική» links; below 744 the kit’s pair', async () => {
		const retry = vi.fn();
		render(StatusPage, {
			props: {
				...props,
				links: [],
				art: 'plug',
				glyph: 'alert-circle',
				title: 'Κάτι πήγε στραβά',
				actions: [
					{ label: 'Δοκιμάστε ξανά', onPress: retry, testId: 'web-retry' },
					{ label: 'Αρχική', href: '/' }
				],
				phoneActions: [
					{ label: 'Δοκιμάστε ξανά', onPress: retry, testId: 'phone-retry' },
					{ label: 'Αρχική', href: '/' }
				]
			}
		});
		await fireEvent.click(screen.getByTestId('web-retry'));
		await fireEvent.click(screen.getByTestId('phone-retry'));
		expect(retry).toHaveBeenCalledTimes(2);
		const page = screen.getByTestId('status');
		expect(page.querySelector('[data-slot="status-page-actions"]')).toHaveClass(
			'hidden',
			'tablet:flex'
		);
		expect(page.querySelector('[data-slot="status-page-phone-actions"]')).toHaveClass(
			'tablet:hidden'
		);
		expect(page.querySelector('[data-slot="status-page-glyph"]')).toHaveClass('tablet:hidden');
	});
});
