import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import type { ResolvedPathname } from '$app/types';
import { page } from '$app/state';
import { env } from '$env/dynamic/public';
import AccountDeletion from './index.svelte';

const props = {
	homeHref: '/',
	legalHref: '/legal',
	otherRows: [
		{ key: 'terms-of-use', label: 'Όροι χρήσης', href: '/legal/terms-of-use' as ResolvedPathname },
		{
			key: 'faq',
			label: 'Πώς μπορώ να διαγράψω το λογαριασμό μου;',
			eyebrow: 'Συχνές ερωτήσεις',
			href: '/help#delete-account' as ResolvedPathname
		}
	],
	canonicalUrl: 'https://www.example.org/account-deletion',
	alternateUrls: {
		el: 'https://www.example.org/account-deletion',
		en: 'https://www.example.org/en/account-deletion'
	}
};

/** A step whose names are bold reads as ONE sentence (its `<li>`), the words unchanged. */
const step = (text: string) => (_: string, element: Element | null) =>
	element?.tagName === 'LI' && element.textContent?.trim() === text;

const GREEK_SUBJECT = 'Αίτημα διαγραφής λογαριασμού';
const ENGLISH_SUBJECT = 'Account deletion request';

const GREEK_PERIODS = [
	/10 χρόνια από την τελευταία σας επίσκεψη στον ίδιο γιατρό/,
	/10 χρόνια από την τελευταία επίσκεψη κάθε ασθενή/,
	/έως τις 31 Δεκεμβρίου του έκτου έτους μετά το έτος έκδοσης/,
	/έως 5 χρόνια μετά το τέλος του έτους στο οποίο αφορούν/,
	/5 χρόνια από τη διαγραφή.*όσο διαρκεί και το πολύ 5 χρόνια/,
	/Θα απαντήσουμε στο αίτημά σας το αργότερο μέσα σε έναν μήνα/
];

const ENGLISH_PERIODS = [
	/10 years from your last visit to that doctor/,
	/10 years from each patient's last visit/,
	/until 31 December of the sixth year after the year of issue/,
	/up to 5 years after the end of the year they concern/,
	/5 years from the deletion.*as long as it lasts and for 5 years at most/,
	/We will answer your request within one month at the latest/
];

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function mailto(email: string, subject: string) {
	return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

afterEach(() => {
	visit('/');
	delete env.PUBLIC_SUPPORT_EMAIL;
});

describe('Account deletion page', () => {
	it('renders the Greek page with the app path, the periods and the support email', () => {
		visit('/account-deletion');
		render(AccountDeletion, { props });

		const title = 'Διαγραφή λογαριασμού eDoctor';
		const appPath = 'Πατήστε Προφίλ → Ρυθμίσεις λογαριασμού → Διαγραφή λογαριασμού.';

		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
		expect(screen.getByText(step(appPath))).toBeInTheDocument();
		for (const period of GREEK_PERIODS) {
			expect(screen.getByText(period)).toBeInTheDocument();
		}

		const link = screen.getByRole('link', { name: 'Στείλτε email' });
		expect(link).toHaveAttribute('href', mailto('support@edoctor.gr', GREEK_SUBJECT));
		expect(screen.getByText('support@edoctor.gr')).toBeInTheDocument();
		expect(screen.getByText(/πριν ή μετά τη διαγραφή/)).toHaveTextContent('(support@edoctor.gr)');
	});

	it('renders the English page under /en with the same periods', () => {
		visit('/en/account-deletion');
		render(AccountDeletion, { props: { ...props, otherRows: [] } });

		const title = 'Delete your eDoctor account';
		const appPath = 'Tap Profile → Account settings → Delete account.';

		expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
		expect(screen.getByText(step(appPath))).toBeInTheDocument();
		for (const period of ENGLISH_PERIODS) {
			expect(screen.getByText(period)).toBeInTheDocument();
		}
		expect(screen.queryByText(/Διαγραφή λογαριασμού/)).not.toBeInTheDocument();

		const link = screen.getByRole('link', { name: 'Send an email' });
		expect(link).toHaveAttribute('href', mailto('support@edoctor.gr', ENGLISH_SUBJECT));
	});

	it('uses the configured support email in the link and in the text', () => {
		env.PUBLIC_SUPPORT_EMAIL = 'help@example.gr';
		visit('/account-deletion');
		render(AccountDeletion, { props });

		const link = screen.getByRole('link', { name: 'Στείλτε email' });
		expect(link).toHaveAttribute('href', mailto('help@example.gr', GREEK_SUBJECT));
		expect(screen.getByText('help@example.gr')).toBeInTheDocument();
		expect(screen.queryByText(/support@edoctor\.gr/)).not.toBeInTheDocument();
	});

	it('ignores a configured value that would add mailto parameters', () => {
		env.PUBLIC_SUPPORT_EMAIL = 'help@example.gr?cc=other@example.gr';
		visit('/account-deletion');
		render(AccountDeletion, { props });

		const link = screen.getByRole('link', { name: 'Στείλτε email' });
		expect(link).toHaveAttribute('href', mailto('support@edoctor.gr', GREEK_SUBJECT));
		expect(screen.queryByText(/other@example\.gr/)).not.toBeInTheDocument();
	});

	it('U-62.1 (the prototype 10): the legal texts’ template — «Αρχική › Νομικά › Διαγραφή λογαριασμού», «Νομικά», the h1, no version, no share, no sign-in card', () => {
		visit('/account-deletion');
		render(AccountDeletion, { props });
		const crumbs = screen.getByRole('navigation', { name: 'Διαδρομή' });
		expect(within(crumbs).getByRole('link', { name: 'Νομικά' })).toHaveAttribute('href', '/legal');
		expect(within(crumbs).getByText('Διαγραφή λογαριασμού')).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.queryByText(/Έκδοση/u)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Κοινοποίηση/u })).not.toBeInTheDocument();
		expect(screen.queryByText(/Σύνδεση ή εγγραφή/u)).not.toBeInTheDocument();
	});

	it('U-62.1 (negative): «Η διαγραφή είναι οριστική» is in the notice ONCE — moved out of the introduction', () => {
		visit('/account-deletion');
		render(AccountDeletion, { props });
		const notice = screen.getByTestId('account-deletion-final');
		expect(notice).toHaveTextContent(
			'Η διαγραφή είναι οριστική: ο λογαριασμός δεν επανέρχεται και δεν μπορείτε να συνδεθείτε ξανά σε αυτόν.'
		);
		expect(screen.getAllByText(/ο λογαριασμός δεν επανέρχεται/u)).toHaveLength(1);
		expect(
			screen.getByText(
				'Μπορείτε να διαγράψετε τον λογαριασμό σας στην εφαρμογή eDoctor οποτεδήποτε: από την ίδια την εφαρμογή ή με αίτημα στην υποστήριξη.'
			)
		).toBeInTheDocument();
	});

	it('U-62.1 Π3–Π5: the four H2s (no cards), the application’s names bold, «Διάρκεια:» bold five times, «Άλλα νομικά κείμενα» with the FAQ', () => {
		visit('/account-deletion');
		const { container } = render(AccountDeletion, { props });
		expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.id)).toEqual(
			expect.arrayContaining(['from-the-app', 'without-the-app', 'deleted-at-once', 'what-we-keep'])
		);
		expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
		const bold = [...container.querySelectorAll('[data-slot="account-deletion-app"] strong')].map(
			(node) => node.textContent
		);
		expect(bold).toEqual([
			'Προφίλ',
			'Ρυθμίσεις λογαριασμού',
			'Διαγραφή λογαριασμού',
			'Αποστολή κωδικού',
			'Οριστική διαγραφή'
		]);
		const durations = [
			...container.querySelectorAll('[data-slot="account-deletion-retained"] li strong')
		];
		expect(durations.map((node) => node.textContent)).toEqual(Array(5).fill('Διάρκεια:'));
		const others = screen.getAllByTestId('account-deletion-others')[0];
		expect(within(others).getByRole('link', { name: /Πώς μπορώ να διαγράψω/u })).toHaveAttribute(
			'href',
			'/help#delete-account'
		);
		expect(
			container.querySelector('[data-slot="account-deletion-app"]')?.closest('[class*="rounded"]')
		).toBeNull();
	});

	it('MINOR-7 of r1 (U-28.4): the head names the page on the site’s origin — canonical, both languages and the OG', () => {
		render(AccountDeletion, { props });
		const head = document.head;
		expect(head.querySelector('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://www.example.org/account-deletion'
		);
		expect(head.querySelector('link[hreflang="en"]')).toHaveAttribute(
			'href',
			'https://www.example.org/en/account-deletion'
		);
		expect(head.querySelector('meta[property="og:url"]')).toHaveAttribute(
			'content',
			'https://www.example.org/account-deletion'
		);
		expect(head.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'website');
	});
});
