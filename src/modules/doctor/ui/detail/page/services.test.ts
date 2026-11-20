import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import type { ResolvedPathname } from '$app/types';
import { queryOptions } from '@tanstack/svelte-query';
import { pushState, replaceState } from '$app/navigation';
import { page } from '$app/state';
import type { DoctorAvailabilitySlotsRequest } from '$modules/doctor/api/availability';
import type { DoctorProfile, DoctorServiceFacts } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '$modules/doctor/lib/detail/detail.sample';
import type { DoctorDetailPageProps } from '../types';
import { doctorServiceKindGlyphs } from '../components/icons';
import Harness from './doctor-detail.harness.svelte';

/** Screens 14 and 15 (U-70, U-71.2, U-72) and the section of 24 (U-75) on the real page. */

// The office's bookable days, as the page reads them: FACTS, so the booking card draws its fields.
vi.mock('$modules/doctor/api/availability', async (importOriginal) => {
	const original = await importOriginal<typeof import('$modules/doctor/api/availability')>();
	const { sampleAvailability } = await import('$modules/doctor/lib/detail/detail.sample');
	return {
		...original,
		doctorAvailabilitySlotsQuery: (request: DoctorAvailabilitySlotsRequest) =>
			queryOptions({
				queryKey: ['test-slots', request.officeId, request.doctorServiceId],
				queryFn: async () => sampleAvailability(request.officeId, { '2026-11-01': [600] })
			})
	};
});

const HREF = 'http://localhost/doctors/dr-athena-papadopoulou';

function service(id: string, extra: Partial<DoctorServiceFacts> = {}): DoctorServiceFacts {
	return {
		id,
		title: `Υπηρεσία ${id}`,
		priceRange: { min: 40, max: 40 },
		kind: 'other',
		...extra
	};
}

function stubApi() {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input), 'http://localhost');
			const data = url.pathname.endsWith('/slots')
				? { doctorId: 'x', officeId: 'off-1', days: [], policy: null }
				: {};
			return new Response(JSON.stringify({ status: 'success', message: 'ok', data }), {
				status: 200
			});
		})
	);
}

const onSignIn = vi.fn();

function props(
	profile: DoctorProfile,
	overrides: Partial<DoctorDetailPageProps> = {}
): DoctorDetailPageProps {
	return {
		load: { state: 'ready', profile, serverNow: SAMPLE_NOW },
		locale: 'el',
		routeSection: null,
		localize: (path) => path,
		similarHref: () => '/doctors' as ResolvedPathname,
		similarAreaQuery: (city) => ({ queryKey: ['area', city], queryFn: async () => null }),
		bookingHref: (slot) => `/doctors/dr/booking?office=${slot.officeId}`,
		canonicalUrl: 'https://edoctor.example/doctors/dr',
		alternateUrls: { el: 'https://edoctor.example/x', en: 'https://edoctor.example/en/x' },
		backHref: '/doctors',
		signedIn: false,
		onSignIn,
		reviewLinks: { helpHref: '/help#what-are-reviews', policyHref: '/legal/review-policy' },
		knowLinks: { cancellationHref: '/help#cancellation', bookingHref: '/help#booking' },
		...overrides
	};
}

const rich = () =>
	sampleDoctorProfile({
		pricingVisible: true,
		licenseObtainedDate: '2013-06-15',
		responseMetrics: { completedVisits: 37, windowMonths: 6 },
		services: [
			service('a', {
				kind: 'visit',
				subtitle: 'Εξέταση',
				durationInMinutes: 30,
				description: 'Το κείμενο της υπηρεσίας.',
				yearsOfExperience: 12,
				completedVisits: 9
			}),
			service('b', { kind: 'follow-up' }),
			service('c', { kind: 'check-up' }),
			service('d')
		]
	});

const open = (
	profile: DoctorProfile,
	section: DoctorDetailPageProps['routeSection'],
	search = ''
) => {
	page.url.href = `${HREF}/details/${section}${search}`;
	render(Harness, { props: props(profile, { routeSection: section }) });
	return screen.getByTestId('doctor-detail-modal');
};

describe('«Υπηρεσίες» and «Τομείς εξειδίκευσης» (U-70, U-72)', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: SAMPLE_NOW });
		page.url.href = HREF;
		page.state = {};
		vi.mocked(pushState).mockClear();
		vi.mocked(replaceState).mockClear();
		onSignIn.mockClear();
		stubApi();
		Element.prototype.scrollIntoView = vi.fn();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		page.url.href = 'http://localhost/';
		document.head.innerHTML = '';
	});

	it('U-70.2 Ε3: «Υπηρεσίες» on the section and in the section bar, never «Κόστος υπηρεσιών»', () => {
		render(Harness, { props: props(rich()) });
		const section = screen.getByTestId('doctor-detail-service-cost');
		expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Υπηρεσίες');
		expect(document.body.textContent).not.toMatch(/Κόστος υπηρεσιών/u);
	});

	it('Π7: three rows, each a link to the page on it, in place; past three «Εμφάνιση όλων των N υπηρεσιών»', async () => {
		render(Harness, { props: props(rich()) });
		const section = screen.getByTestId('doctor-detail-service-cost');
		const rows = within(section).getAllByRole('link', { name: /Υπηρεσία/u });
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveAttribute(
			'href',
			'/doctors/dr-athena-papadopoulou/details/services?focus=a'
		);
		await fireEvent.click(rows[0]);
		expect(pushState).toHaveBeenCalledWith(
			'/doctors/dr-athena-papadopoulou/details/services?focus=a',
			{
				doctorDetails: { section: 'services', focus: 'a', inPlace: true }
			}
		);
		expect(screen.getByTestId('doctor-detail-service-cost-show-more')).toHaveTextContent(
			'Εμφάνιση όλων των 4 υπηρεσιών'
		);
	});

	it('U-34.4: a guest’s «🔒 Συνδεθείτε για κόστος» is its own press, beside the row’s, and signs in', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		const signIn = screen.getByTestId('doctor-detail-priced-service-fee-svc-3');
		expect(signIn.closest('a')).toBeNull();
		expect(signIn).toHaveTextContent('Συνδεθείτε για κόστος');
		await fireEvent.click(signIn);
		expect(onSignIn).toHaveBeenCalledWith({ action: 'fee' });
		expect(pushState).not.toHaveBeenCalled();
	});

	// Rewrites «Π4, Π5: the groups, the glyph of the kind, the row that opens in place…» by U-209.3 (D-W52-56 / 60): no
	// service is a field of expertise, so Π4's groups are gone; Π5 stands.
	it('Π5 · 🔴 D-W52-60 (U-209.3): ONE list — no «Τομείς εξειδίκευσης», no «Άλλες υπηρεσίες» — the glyph of the kind, the row that opens in place: «Περιγραφή», never «Περιλαμβάνει»', async () => {
		const window = open(rich(), 'services');
		expect(window).toHaveAttribute('data-section', 'services');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent('Υπηρεσίες');
		const list = within(window).getByTestId('doctor-detail-modal-services-all');
		expect(within(list).getAllByRole('button', { name: /^Υπηρεσία / })).toHaveLength(4);
		expect(within(window).queryByTestId('doctor-detail-modal-services-other')).toBeNull();
		expect(within(window).queryByTestId('doctor-detail-modal-services-specializations')).toBeNull();
		expect(within(window).queryByRole('heading', { level: 3 })).toBeNull();
		expect(window.textContent).not.toMatch(/Τομείς εξειδίκευσης|Άλλες υπηρεσίες/u);
		expect(within(window).getByTestId('doctor-detail-priced-service-glyph-a')).toHaveAttribute(
			'data-icon',
			'medkit-outline'
		);
		const row = within(window).getByRole('button', { name: 'Υπηρεσία a' });
		expect(row).toHaveAttribute('aria-expanded', 'false');
		await fireEvent.click(row);
		expect(row).toHaveAttribute('aria-expanded', 'true');
		expect(within(window).getByText('Περιγραφή')).toBeInTheDocument();
		expect(
			within(window).getByTestId('doctor-detail-priced-service-description-a')
		).toHaveTextContent('Το κείμενο της υπηρεσίας.');
		expect(window.textContent).not.toMatch(/Περιλαμβάνει/u);
	});

	// Rewrites «Π3, Π4 (screen 15): …each field with its years and visits…» and «U-72.3: a field without visits or years
	// writes nothing, ούτε «0»» by U-209.3: «τα χρόνια και οι επισκέψεις μένουν στις υπηρεσίες».
	it('🔴 D-W52-60 (U-209.3) · U-72.3: a service’s OWN years and visits are drawn in its open row, with the note of what the visits count; a service without them writes nothing, ούτε «0»', async () => {
		const window = open(rich(), 'services');
		await fireEvent.click(within(window).getByRole('button', { name: 'Υπηρεσία a' }));
		expect(screen.getByTestId('doctor-detail-priced-service-years-a')).toHaveTextContent(
			'12 χρόνια εμπειρίας'
		);
		expect(screen.getByTestId('doctor-detail-priced-service-visits-a')).toHaveTextContent(
			'9 επισκέψεις'
		);
		expect(screen.getByTestId('doctor-detail-services-footnote')).toHaveTextContent(
			/^Οι επισκέψεις μετρούν/u
		);
		await fireEvent.click(within(window).getByRole('button', { name: 'Υπηρεσία d' }));
		expect(screen.queryByTestId('doctor-detail-priced-service-years-d')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-priced-service-visits-d')).toBeNull();
		const slot = window.querySelector('[data-service-slot="d"]');
		expect(slot?.textContent).not.toMatch(/\b0\b/u);
		expect(window.textContent).not.toMatch(/\(6|6 μήν|μηνών/u);
	});

	it('U-70.1: καμία αναζήτηση υπηρεσιών, whatever their number', () => {
		const window = open(rich(), 'services');
		expect(within(window).queryByRole('searchbox')).toBeNull();
		expect(window.querySelector('input')).toBeNull();
	});

	it('U-89.1: κανένα `online` στα είδη υπηρεσίας, κανένα `videocam`', () => {
		expect(Object.keys(doctorServiceKindGlyphs).sort()).toEqual([
			'check-up',
			'follow-up',
			'other',
			'visit'
		]);
		expect(Object.values(doctorServiceKindGlyphs)).toEqual([
			'checkmark-done-outline',
			'shield-checkmark-outline',
			'medkit-outline',
			'medical-outline'
		]);
	});

	it('Π7: `focus` opens that row and goes to it', async () => {
		const window = open(rich(), 'services', '?focus=a');
		await waitFor(() =>
			expect(within(window).getByRole('button', { name: 'Υπηρεσία a' })).toHaveAttribute(
				'aria-expanded',
				'true'
			)
		);
		await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
	});

	it('Π8: a single service is already open; U-38: none opens nothing', () => {
		const window = open(
			sampleDoctorProfile({ services: [service('solo', { description: 'Κ' })] }),
			'services'
		);
		expect(within(window).getByRole('button', { name: 'Υπηρεσία solo' })).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		cleanup();
		page.url.href = `${HREF}/details/services`;
		render(Harness, {
			props: props(sampleDoctorProfile({ services: [] }), { routeSection: 'services' })
		});
		expect(screen.queryByTestId('doctor-detail-modal')).toBeNull();
	});

	it('Π5: «Κλείστε για αυτή την υπηρεσία» gives the window’s place to the «Διαθεσιμότητα» of that service', async () => {
		page.state = { doctorDetails: { section: 'services', inPlace: true } };
		render(Harness, { props: props(rich()) });
		await fireEvent.click(screen.getByRole('button', { name: 'Υπηρεσία a' }));
		// Δ1: the calendar wears the button's own words' colour: left to inherit, it vanishes on the dark fill.
		expect(
			screen
				.getByTestId('doctor-detail-priced-service-book-a')
				.querySelector('[data-icon="calendar-outline"]')
		).toHaveClass('text-secondary-foreground');
		await fireEvent.click(screen.getByTestId('doctor-detail-priced-service-book-a'));
		expect(replaceState).toHaveBeenCalledWith(
			'/doctors/dr-athena-papadopoulou/details/availability?service=a',
			{ doctorDetails: { section: 'availability', service: 'a', inPlace: true } }
		);
		expect(await screen.findByTestId('doctor-booking-card-fields')).toBeInTheDocument();
	});

	// Rewrites «U-72.3 Ε3: the group’s title opens the fields in the SAME window, with «‹» and its own step in the
	// history» and «U-72.3 Ε3: «‹» goes back one step, «×» closes both» by U-209.3 (D-W52-56 / 60, task doc §6): the
	// services hold no field of expertise, so nothing of them leads to that page.
	it('🔴 D-W52-60 (U-209.3; it replaces U-72.3 Ε3): the services have NO way to «Τομείς εξειδίκευσης» — no title that is a link, no «‹» — and «×» of either window closes ONE step', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
		const go = vi.spyOn(history, 'go').mockImplementation(() => undefined);
		page.state = { doctorDetails: { section: 'services', inPlace: true } };
		render(Harness, { props: props(rich()) });
		const services = screen.getByTestId('doctor-detail-modal');
		expect(screen.queryByTestId('doctor-detail-modal-services-to-specializations')).toBeNull();
		expect(services.querySelector('a[href*="/details/specializations"]')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-modal-back')).toBeNull();
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-close'));
		expect(back).toHaveBeenCalledOnce();
		expect(pushState).not.toHaveBeenCalled();
		cleanup();

		page.state = { doctorDetails: { section: 'specializations', inPlace: true } };
		render(Harness, { props: props(rich()) });
		expect(screen.getAllByTestId('doctor-detail-modal')).toHaveLength(1);
		expect(screen.queryByTestId('doctor-detail-modal-back')).toBeNull();
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-close'));
		expect(back).toHaveBeenCalledTimes(2);
		expect(go).not.toHaveBeenCalled();
		back.mockRestore();
		go.mockRestore();
	});

	// Rewrites «Π3, Π4 (screen 15): the card’s figures, each field with its years and visits, the note» by U-209.3
	// (D-W52-60): the fields are the doctor's specializations of the closed list; Π3 and the note stand.
	it('Π3 · 🔴 D-W52-60 (screen 15): the card’s figures, the doctor’s specializations by name — never a service, nothing to press — and the note', () => {
		const window = open(rich(), 'specializations');
		expect(window).toHaveAttribute('data-section', 'specializations');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Τομείς εξειδίκευσης'
		);
		const stats = within(window).getByRole('list', { name: 'Με μια ματιά' });
		expect(stats).toHaveTextContent('2');
		expect(stats).toHaveTextContent('Επισκέψεις');
		const fields = within(window).getByTestId('doctor-detail-specializations-domains');
		expect(
			[...fields.querySelectorAll('[data-slot="list-row-title"]')].map((row) => row.textContent)
		).toEqual(['Εντατική θεραπεία', 'Σακχαρώδης διαβήτης']);
		expect(
			within(window).getByTestId('doctor-detail-specializations-domain-PR021-03')
		).toHaveTextContent('Εντατική θεραπεία');
		expect(fields.querySelector('a, button')).toBeNull();
		expect(fields.textContent).not.toMatch(/Υπηρεσία|€|χρόνια εμπειρίας|επισκέψεις|Κλείστε/u);
		expect(window.querySelector('[data-testid^="doctor-detail-specializations-book-"]')).toBeNull();
		expect(screen.getByTestId('doctor-detail-specializations-footnote')).toHaveTextContent(
			/Οι επισκέψεις μετρούν/u
		);
		expect(screen.queryByTestId('doctor-detail-modal-back')).toBeNull();
	});

	// Rewrites «U-36.2, U-72.3 Π1»'s rows of the profile by U-209.3 (D-W52-60).
	it('🔴 D-W52-60 (screen 5): the profile’s «Τομείς εξειδίκευσης» are the specializations by name, under «Ολοκληρωμένες επισκέψεις» — no fee, nothing to press but «Εμφάνιση λεπτομερειών», which opens their page in place; without a specialization the section is gone, whatever the services', async () => {
		render(Harness, { props: props(rich()) });
		const section = screen.getByTestId('doctor-detail-specializations');
		expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Τομείς εξειδίκευσης'
		);
		expect(within(section).getByTestId('doctor-detail-specializations-visits')).toHaveTextContent(
			'Ολοκληρωμένες επισκέψεις: 37'
		);
		const items = within(section).getByTestId('doctor-detail-specializations-items');
		expect(
			[...items.querySelectorAll('[data-slot="list-row-title"]')].map((row) => row.textContent)
		).toEqual(['Εντατική θεραπεία', 'Σακχαρώδης διαβήτης']);
		expect(items.querySelector('a, button')).toBeNull();
		expect(items.textContent).not.toMatch(/Υπηρεσία|€|Συνδεθείτε/u);
		const more = within(section).getByTestId('doctor-detail-specializations-more');
		expect(more).toHaveTextContent('Εμφάνιση λεπτομερειών');
		expect(more).toHaveAttribute('href', '/doctors/dr-athena-papadopoulou/details/specializations');
		await fireEvent.click(more);
		expect(pushState).toHaveBeenCalledWith(
			'/doctors/dr-athena-papadopoulou/details/specializations',
			{ doctorDetails: { section: 'specializations', inPlace: true } }
		);
		cleanup();

		// Nothing more to say on their page (no visits, no licence day): no button at all.
		render(Harness, {
			props: props(
				sampleDoctorProfile({ licenseObtainedDate: undefined, responseMetrics: undefined })
			)
		});
		expect(screen.getByTestId('doctor-detail-specializations-items')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-detail-specializations-more')).toBeNull();
		cleanup();

		render(Harness, { props: props({ ...rich(), specializations: undefined }) });
		expect(screen.queryByTestId('doctor-detail-specializations')).toBeNull();
		expect(document.body.textContent).not.toMatch(/Τομείς εξειδίκευσης/u);
		expect(screen.getByTestId('doctor-detail-service-cost')).toBeInTheDocument();
	});

	it('U-72.4: κανένα «(6 μήνες)» στην 15 ούτε στην ενότητα του προφίλ', () => {
		open(rich(), 'specializations');
		const words = document.body.textContent ?? '';
		expect(words).toMatch(/Ολοκληρωμένες επισκέψεις: 37/u);
		expect(words).not.toMatch(/\(6|6 μήν|μηνών/u);
	});

	it('🔴 U-65.6 (negative): what a doctor wrote is text everywhere: no element out of it', async () => {
		const evil = '<img src=x onerror=alert(1)>';
		const window = open(
			sampleDoctorProfile({
				services: [
					service('e', {
						title: evil,
						subtitle: evil,
						description: `<script>alert(1)</script>${evil}`
					})
				],
				specializations: [{ code: 'PR021-03', name: evil }]
			}),
			'services'
		);
		expect(window.querySelector('img, script')).toBeNull();
		expect(window).toHaveTextContent(evil);
		expect(document.querySelector('[data-testid="doctor-detail-service-cost"] img')).toBeNull();
		// 🔴 D-W52-60: a specialization's name is the server's, and still only text — on the profile and on its page.
		const section = screen.getByTestId('doctor-detail-specializations');
		expect(section.querySelector('img, script')).toBeNull();
		expect(section).toHaveTextContent(evil);
		await tick();
		cleanup();
		const fields = open(
			sampleDoctorProfile({ specializations: [{ code: 'PR021-03', name: evil }] }),
			'specializations'
		);
		expect(fields.querySelector('img, script')).toBeNull();
		expect(fields).toHaveTextContent(evil);
	});
});

describe('«Τι πρέπει να γνωρίζετε» (U-75, screen 24)', () => {
	const policy = (hours: number, mode: 'AUTO' | 'MANUAL' = 'AUTO') => ({
		confirmationMode: mode,
		cancellationCutoffHours: hours,
		minBookingNoticeHours: 1
	});
	const withPolicies = (a = policy(4), b = policy(8, 'MANUAL')) =>
		sampleDoctorProfile({
			offices: [
				{ officeId: 'off-1', street: 'Νίκης', streetNumber: '12', bookingPolicy: a },
				{ officeId: 'off-2', street: 'Ερμού', streetNumber: '81', bookingPolicy: b }
			]
		});

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: SAMPLE_NOW });
		page.url.href = HREF;
		page.state = {};
		vi.mocked(pushState).mockClear();
		stubApi();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		page.url.href = 'http://localhost/';
		document.head.innerHTML = '';
	});

	it('Ε1: the profile’s LAST section, after the biography and the articles', () => {
		const articles = createRawSnippet(() => ({
			render: () => '<section data-testid="articles-slot"></section>'
		}));
		render(Harness, { props: props(withPolicies(), { articles }) });
		const ids = [...document.querySelectorAll('[data-section]')].map((node) =>
			node.getAttribute('data-section')
		);
		expect(ids.at(-2)).toBe('bio');
		expect(ids.at(-1)).toBe('know');
		const follows = (first: Element | null, second: Element | null) =>
			first!.compareDocumentPosition(second!) & Node.DOCUMENT_POSITION_FOLLOWING;
		const slot = screen.getByTestId('articles-slot');
		expect(follows(document.querySelector('[data-section="bio"]'), slot)).toBeTruthy();
		expect(follows(slot, document.querySelector('[data-section="know"]'))).toBeTruthy();
	});

	it('Π1: each block is a link to its page, in place, as a row below 744 and a block from 744 (CSS)', async () => {
		render(Harness, { props: props(withPolicies()) });
		const row = screen.getByTestId('doctor-know-row-cancel');
		expect(row).toHaveClass('tablet:hidden');
		expect(row).toHaveAttribute(
			'href',
			'/doctors/dr-athena-papadopoulou/details/know?focus=cancel'
		);
		expect(screen.getByTestId('doctor-know-more-cancel')).toHaveAccessibleName(
			'Εμφάνιση περισσότερων: Πολιτική ακύρωσης'
		);
		await fireEvent.click(row);
		expect(pushState).toHaveBeenCalledWith(
			'/doctors/dr-athena-papadopoulou/details/know?focus=cancel',
			{ doctorDetails: { section: 'know', focus: 'cancel', inPlace: true } }
		);
	});

	it('Ε4: the pills only when the offices’ rules differ', () => {
		render(Harness, { props: props(withPolicies()) });
		expect(screen.getByTestId('doctor-know-tabs')).toBeInTheDocument();
		expect(screen.getByTestId('doctor-know-office')).toHaveTextContent('Ισχύει για το ιατρείο');
		cleanup();
		render(Harness, { props: props(withPolicies(policy(4), policy(4))) });
		expect(screen.queryByTestId('doctor-know-tabs')).toBeNull();
		expect(screen.queryByTestId('doctor-know-office')).toBeNull();
	});

	it('U-38: a doctor without services has no section', () => {
		render(Harness, { props: props(sampleDoctorProfile({ services: [] })) });
		expect(screen.queryByTestId('doctor-detail-know')).toBeNull();
	});

	it('Π3: the address opens its page in the small window: its rows, the office’s `tel:`, the way on to the Help Centre', async () => {
		page.url.href = `${HREF}/details/know?focus=cancel`;
		render(Harness, { props: props(withPolicies(), { routeSection: 'know' }) });
		const window = await screen.findByTestId('doctor-know-page');
		expect(window).toHaveAttribute('role', 'dialog');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Πολιτική ακύρωσης'
		);
		expect(window).toHaveTextContent('Μετά το όριο, δεν ακυρώνεται online');
		expect(within(window).getByRole('link', { name: '2101234567' })).toHaveAttribute(
			'href',
			'tel:2101234567'
		);
		expect(screen.getByTestId('doctor-know-link-help-cancellation')).toHaveAttribute(
			'href',
			'/help#cancellation'
		);
	});

	it('Π3 (negative): `focus` that names no page opens nothing', () => {
		page.url.href = `${HREF}/details/know?focus=nothing`;
		render(Harness, { props: props(withPolicies(), { routeSection: 'know' }) });
		expect(screen.queryByTestId('doctor-know-page')).toBeNull();
	});

	it('U-75.2: καμία χρέωση, ούτε εκπρόθεσμη, στη σελίδα ακύρωσης', async () => {
		page.url.href = `${HREF}/details/know?focus=cancel`;
		render(Harness, { props: props(withPolicies(), { routeSection: 'know' }) });
		const window = await screen.findByTestId('doctor-know-page');
		expect(window.textContent).not.toMatch(/χρέωσ|χρεών|εκπρόθεσμ/u);
	});

	it('«×» closes the page by the page’s own way', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
		page.state = { doctorDetails: { section: 'know', focus: 'before', inPlace: true } };
		render(Harness, { props: props(withPolicies()) });
		await fireEvent.click(await screen.findByTestId('doctor-know-page-close'));
		expect(back).toHaveBeenCalledOnce();
		back.mockRestore();
	});
});
