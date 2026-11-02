import { describe, expect, it } from 'vitest';
import { buildStatusPage, statusCodeLabel } from './status';

const href = (path: string) => (path === '/' ? '/en' : `/en${path}`);

describe('shell::lib::status', () => {
	it('U-61.1 (the prototype 09 `?v=404`): the 404 — its sentence, the old-link line, the code, «Ίσως σας βοηθήσουν:» and the four ways on, the map pin', () => {
		const page = buildStatusPage(404, 'el', (path) => path);
		expect(page).toMatchObject({
			missing: true,
			oops: 'Ωχ!',
			glyph: 'compass-outline',
			art: 'pin',
			title: 'Δεν βρίσκουμε τη σελίδα που ψάχνετε.',
			text: 'Ο σύνδεσμος μπορεί να είναι παλιός ή λανθασμένος.',
			codeLabel: 'Κωδικός σφάλματος: 404',
			linksTitle: 'Ίσως σας βοηθήσουν:',
			documentTitle: 'Η σελίδα δεν βρέθηκε | eDoctor'
		});
		expect(page.links.map((link) => [link.label, link.href])).toEqual([
			['Αρχική', '/'],
			['Αναζήτηση γιατρών', '/doctors'],
			['Άρθρα υγείας', '/articles'],
			['Κέντρο βοήθειας', '/help']
		]);
		expect(page.actions).toEqual([]);
		expect(page.phoneActions.map((action) => action.label)).toEqual([
			'Αναζήτηση γιατρών',
			'Κέντρο βοήθειας'
		]);
	});

	it('U-61.1 / U-61.2 Ε2 (`?v=error`): any other status — «Κάτι πήγε στραβά», its line, «Δοκιμάστε ξανά» + «Αρχική», the plug', () => {
		const page = buildStatusPage(500, 'el', (path) => path);
		expect(page).toMatchObject({
			missing: false,
			glyph: 'alert-circle',
			art: 'plug',
			title: 'Κάτι πήγε στραβά',
			text: 'Δεν φταίτε εσείς. Δοκιμάστε ξανά σε λίγο.',
			codeLabel: 'Κωδικός σφάλματος: 500',
			links: []
		});
		expect(page.actions).toEqual([
			{ label: 'Δοκιμάστε ξανά', retry: true },
			{ label: 'Αρχική', href: '/' }
		]);
	});

	it('U-61.2 Ε2 (negative): no status page says «Δοκιμή ξανά»', () => {
		for (const status of [404, 500, 503]) {
			const page = buildStatusPage(status, 'el', (path) => path);
			expect(JSON.stringify(page)).not.toContain('Δοκιμή ξανά');
		}
	});

	it('U-61.1: every way on is in the page’s language; the code line only for a status of 400–599', () => {
		const page = buildStatusPage(404, 'en', href);
		expect(page.links.map((link) => link.href)).toEqual([
			'/en',
			'/en/doctors',
			'/en/articles',
			'/en/help'
		]);
		expect(page.title).toBe('We can’t find the page you’re looking for.');
		expect(statusCodeLabel(200, 'el')).toBe('');
		expect(statusCodeLabel(503, 'en')).toBe('Error code: 503');
	});
});
