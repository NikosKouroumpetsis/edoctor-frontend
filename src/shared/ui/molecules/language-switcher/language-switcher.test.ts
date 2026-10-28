import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import LanguageSwitcher from './language-switcher.svelte';

const options = [
	{ locale: 'el', href: '/doctors', label: 'Ελληνικά', shortLabel: 'EL', current: true },
	{ locale: 'en', href: '/en/doctors', label: 'English', shortLabel: 'EN', current: false }
];

describe('LanguageSwitcher', () => {
	it('U-03.8: links each language to the hrefs the caller resolved, the current one marked', () => {
		render(LanguageSwitcher, { props: { options, 'aria-label': 'Γλώσσα' } });
		expect(screen.getByRole('group', { name: 'Γλώσσα' })).toBeInTheDocument();
		const greek = screen.getByRole('link', { name: 'Ελληνικά' });
		const english = screen.getByRole('link', { name: 'English' });
		expect(greek).toHaveAttribute('href', '/doctors');
		expect(greek).toHaveAttribute('aria-current', 'true');
		expect(greek).toHaveClass(
			'bg-secondary',
			'text-secondary-foreground',
			'min-h-touch',
			'min-w-touch'
		);
		expect(english).toHaveAttribute('href', '/en/doctors');
		expect(english).toHaveAttribute('hreflang', 'en');
		expect(english).not.toHaveAttribute('aria-current');
		expect(english).toHaveTextContent('EN');
	});
});
