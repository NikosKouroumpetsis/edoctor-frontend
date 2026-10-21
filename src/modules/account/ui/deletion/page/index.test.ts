import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { page } from '$app/state';
import { env } from '$env/dynamic/public';
import AccountDeletion from './index.svelte';

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
		render(AccountDeletion);

		const title = 'Διαγραφή λογαριασμού eDoctor';
		const appPath = 'Πατήστε Προφίλ → Ρυθμίσεις λογαριασμού → Διαγραφή λογαριασμού.';

		expect(screen.getByRole('main')).toBeInTheDocument();
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
		expect(screen.getByText(appPath)).toBeInTheDocument();
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
		render(AccountDeletion);

		const title = 'Delete your eDoctor account';
		const appPath = 'Tap Profile → Account settings → Delete account.';

		expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
		expect(screen.getByText(appPath)).toBeInTheDocument();
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
		render(AccountDeletion);

		const link = screen.getByRole('link', { name: 'Στείλτε email' });
		expect(link).toHaveAttribute('href', mailto('help@example.gr', GREEK_SUBJECT));
		expect(screen.getByText('help@example.gr')).toBeInTheDocument();
		expect(screen.queryByText(/support@edoctor\.gr/)).not.toBeInTheDocument();
	});

	it('ignores a configured value that would add mailto parameters', () => {
		env.PUBLIC_SUPPORT_EMAIL = 'help@example.gr?cc=other@example.gr';
		visit('/account-deletion');
		render(AccountDeletion);

		const link = screen.getByRole('link', { name: 'Στείλτε email' });
		expect(link).toHaveAttribute('href', mailto('support@edoctor.gr', GREEK_SUBJECT));
		expect(screen.queryByText(/other@example\.gr/)).not.toBeInTheDocument();
	});
});
