import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import { page } from '$app/state';
import type { DoctorProfile } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '$modules/doctor/lib/detail/detail.sample';
import type { DoctorAboutPageProps } from '../types';
import About from './about.svelte';

const onOpenReview = vi.fn();

function props(
	profile: DoctorProfile,
	overrides: Partial<DoctorAboutPageProps> = {}
): DoctorAboutPageProps {
	return {
		load: { state: 'ready', profile, serverNow: SAMPLE_NOW },
		locale: 'el',
		canonicalUrl: 'https://edoctor.example/doctors/dr/about',
		alternateUrls: {
			el: 'https://edoctor.example/doctors/dr/about',
			en: 'https://edoctor.example/en/doctors/dr/about'
		},
		doctorsHref: '/doctors' as ResolvedPathname,
		profileHref: '/doctors/dr' as ResolvedPathname,
		reviewsHref: '/doctors/dr/details/reviews' as ResolvedPathname,
		onOpenReview,
		focusBio: false,
		...overrides
	};
}

const credentials = ['a', 'b', 'c', 'd'].map((id, index) => ({
	id,
	kind: 'STUDY' as const,
	title: `Σπουδή ${id}`,
	organization: 'ΕΚΠΑ',
	startYear: 2010 - index,
	endYear: 2012 - index,
	isCurrent: false
}));

describe('the doctor’s page (U-73, screen 16)', () => {
	beforeEach(() => {
		onOpenReview.mockClear();
		page.url.href = 'http://localhost/doctors/dr/about';
		page.state = {};
	});
	afterEach(() => {
		cleanup();
		document.head.innerHTML = '';
	});

	it('Π2: one h1, the breadcrumbs to the doctors and the profile, «×» of the sheet to the profile', () => {
		render(About, { props: props(sampleDoctorProfile()) });
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
			'Γνωρίστε τον επαγγελματία υγείας'
		);
		const crumbs = within(screen.getByTestId('doctor-about-breadcrumbs'));
		expect(crumbs.getByRole('link', { name: 'Γιατροί' })).toHaveAttribute('href', '/doctors');
		expect(crumbs.getByRole('link', { name: 'Αθηνά Παπαδοπούλου' })).toHaveAttribute(
			'href',
			'/doctors/dr'
		);
		expect(screen.getByTestId('doctor-about-close')).toHaveAttribute('href', '/doctors/dr');
		expect(screen.getByTestId('doctor-about-close')).toHaveAccessibleName('Κλείσιμο');
	});

	it('U-81.2: one element, two shapes by CSS: the sheet below 744, a page from 744', () => {
		render(About, { props: props(sampleDoctorProfile()) });
		expect(screen.getByTestId('doctor-about-page')).toHaveClass(
			'fixed',
			'top-3',
			'rounded-t-xl',
			'animate-sheet-rise',
			'tablet:static',
			'tablet:animate-page-settle'
		);
	});

	it('Π3: the card with its figures; «Κριτικές» leads to the page’s reviews; U-45.2 the laurels by the backend', () => {
		render(About, { props: props(sampleDoctorProfile({ isPatientsChoice: true })) });
		expect(screen.getByTestId('doctor-about-card')).toHaveClass('shadow-raised');
		expect(screen.getByTestId('doctor-about-badge')).toHaveTextContent('Επιλογή ασθενών');
		expect(screen.getByTestId('doctor-about-stat-reviews')).toHaveAttribute('href', '#reviews');
	});

	it('Π6: the timeline by groups; past three «Εμφάνιση όλων (4)»', async () => {
		render(About, { props: props(sampleDoctorProfile({ credentials })) });
		const bio = screen.getByTestId('doctor-about-bio');
		expect(bio).toHaveAttribute('id', 'bio');
		const toggle = within(bio).getByTestId('doctor-about-bio-studies-toggle');
		expect(toggle).toHaveTextContent('Εμφάνιση όλων (4)');
		await fireEvent.click(toggle);
		expect(toggle).toHaveTextContent('Εμφάνιση λιγότερων');
		expect(within(bio).getByTestId('doctor-about-bio-studies-item-a')).toHaveTextContent(
			'2010 – 2012'
		);
	});

	it('`#bio`, U-100: the biography it came for is marked as the landing, and nothing lights up', () => {
		render(About, { props: props(sampleDoctorProfile({ credentials }), { focusBio: true }) });
		expect(screen.getByTestId('doctor-about-bio')).toHaveAttribute('data-focused');
	});

	it('Π7: the reviews, «Περισσότερα» on one and all of them', async () => {
		render(About, { props: props(sampleDoctorProfile()) });
		const reviews = screen.getByTestId('doctor-about-reviews');
		expect(within(reviews).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Κριτικές για τον/την Dr. Αθηνά Παπαδοπούλου'
		);
		expect(screen.getByTestId('doctor-about-reviews-all')).toHaveAttribute(
			'href',
			'/doctors/dr/details/reviews'
		);
		expect(screen.getByTestId('doctor-about-reviews-all')).toHaveTextContent(
			'Εμφάνιση όλων των 184 κριτικών'
		);
	});

	it('Π8: the articles are the screen’s, under the page’s own title', () => {
		const articles = createRawSnippet<[string]>((title) => ({
			render: () => `<p data-testid="row">${title()}</p>`
		}));
		render(About, { props: props(sampleDoctorProfile(), { articles }) });
		expect(screen.getByTestId('row')).toHaveTextContent('Άρθρα του/της Dr. Αθηνά Παπαδοπούλου');
	});

	// Rewrites «🔴 record: «Επικοινωνήστε με τον γιατρό» has no place until it has an action»: U-84.6 gives it one.
	it('🔴 U-84.6 (Π9): «Επικοινωνήστε με τον γιατρό» under the rows and the links, before the text; the page writes none of its own', () => {
		const contact = createRawSnippet(() => ({
			render: () => `<button data-testid="contact">x</button>`
		}));
		const { unmount } = render(About, { props: props(sampleDoctorProfile(), { contact }) });
		const button = screen.getByTestId('contact');
		const rows = screen.getByTestId('doctor-about-rows');
		const text = screen.getByTestId('doctor-about-description');
		expect(rows.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(button.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		unmount();
		render(About, { props: props(sampleDoctorProfile()) });
		expect(document.body.textContent).not.toMatch(/Επικοινωνήστε/u);
	});

	it('Π10: each section only with data', () => {
		render(About, {
			props: props(
				sampleDoctorProfile({
					description: undefined,
					bio: undefined,
					reviewSnippets: undefined,
					socialLinks: undefined
				})
			)
		});
		expect(screen.queryByTestId('doctor-about-bio')).toBeNull();
		expect(screen.queryByTestId('doctor-about-reviews')).toBeNull();
		expect(screen.queryByTestId('doctor-about-description')).toBeNull();
		expect(screen.queryByTestId('doctor-about-links')).toBeNull();
	});

	it('U-72.4 / U-89.1: no period and no video call in its words', () => {
		render(About, { props: props(sampleDoctorProfile({ credentials })) });
		expect(document.body.textContent).not.toMatch(/\(6|6 μήν|βιντεοκλήσ/u);
	});

	it('🔴 U-65.6 (negative): every word of a doctor is text: no element out of it', () => {
		const evil = '<img src=x onerror=alert(1)>';
		render(About, {
			props: props(
				sampleDoctorProfile({
					name: evil,
					description: { paragraphs: [`<script>alert(1)</script>${evil}`] },
					credentials: [{ ...credentials[0], title: evil, organization: evil }]
				})
			)
		});
		const root = screen.getByTestId('doctor-about-page');
		expect(root.querySelector('img[src="x"], script')).toBeNull();
		expect(screen.getByTestId('doctor-about-description')).toHaveTextContent(
			'<script>alert(1)</script>'
		);
	});

	it('the page speaks for itself in the head: its title, its own canonical address', () => {
		render(About, { props: props(sampleDoctorProfile()) });
		expect(document.title).toBe('Γνωρίστε τον επαγγελματία υγείας · Αθηνά Παπαδοπούλου | eDoctor');
		expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://edoctor.example/doctors/dr/about'
		);
	});
});
