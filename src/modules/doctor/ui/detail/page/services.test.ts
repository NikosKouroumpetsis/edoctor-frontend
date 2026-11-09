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
		isSpecialized: false,
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
				isSpecialized: true,
				kind: 'visit',
				subtitle: 'Εξέταση',
				durationInMinutes: 30,
				description: 'Το κείμενο της υπηρεσίας.',
				yearsOfExperience: 12,
				completedVisits: 9
			}),
			service('b', { kind: 'follow-up' }),
			service('c', { kind: 'check-up' }),
			service('d', { isSpecialized: true })
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

	it('Π4, Π5: the groups, the glyph of the kind, the row that opens in place: «Περιγραφή», never «Περιλαμβάνει»', async () => {
		const window = open(rich(), 'services');
		expect(window).toHaveAttribute('data-section', 'services');
		expect(within(window).getByRole('heading', { level: 2 })).toHaveTextContent('Υπηρεσίες');
		expect(within(window).getByTestId('doctor-detail-modal-services-other')).toHaveTextContent(
			'Άλλες υπηρεσίες'
		);
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

	it('U-72.3 Ε3: the group’s title opens the fields in the SAME window, with «‹» and its own step in the history', async () => {
		page.state = { doctorDetails: { section: 'services', inPlace: true } };
		render(Harness, { props: props(rich()) });
		const link = screen.getByTestId('doctor-detail-modal-services-to-specializations');
		expect(link).toHaveAttribute('href', '/doctors/dr-athena-papadopoulou/details/specializations');
		await fireEvent.click(link);
		expect(pushState).toHaveBeenCalledWith(
			'/doctors/dr-athena-papadopoulou/details/specializations',
			{
				doctorDetails: {
					section: 'specializations',
					inPlace: true,
					fromServices: true,
					servicesInPlace: true
				}
			}
		);
	});

	it('U-72.3 Ε3: «‹» goes back one step, «×» closes both', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
		const go = vi.spyOn(history, 'go').mockImplementation(() => undefined);
		page.state = {
			doctorDetails: {
				section: 'specializations',
				inPlace: true,
				fromServices: true,
				servicesInPlace: true
			}
		};
		render(Harness, { props: props(rich()) });
		const windows = screen.getAllByTestId('doctor-detail-modal');
		expect(windows).toHaveLength(1);
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-back'));
		expect(back).toHaveBeenCalledOnce();
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-close'));
		expect(go).toHaveBeenCalledWith(-2);
		back.mockRestore();
		go.mockRestore();
	});

	it('Π3, Π4 (screen 15): the card’s figures, each field with its years and visits, the note', () => {
		const window = open(rich(), 'specializations');
		expect(window).toHaveAttribute('data-section', 'specializations');
		const stats = within(window).getByRole('list', { name: 'Με μια ματιά' });
		expect(stats).toHaveTextContent('2');
		expect(stats).toHaveTextContent('Επισκέψεις');
		expect(screen.getByTestId('doctor-detail-specializations-years-a')).toHaveTextContent(
			'12 χρόνια εμπειρίας'
		);
		expect(screen.getByTestId('doctor-detail-specializations-visits-a')).toHaveTextContent(
			'9 επισκέψεις'
		);
		expect(screen.getByTestId('doctor-detail-specializations-footnote')).toHaveTextContent(
			/Οι επισκέψεις μετρούν/u
		);
		expect(screen.queryByTestId('doctor-detail-modal-back')).toBeNull();
	});

	it('U-72.3: a field without visits or years writes nothing, ούτε «0»', () => {
		open(rich(), 'specializations');
		expect(screen.queryByTestId('doctor-detail-specializations-years-d')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-specializations-visits-d')).toBeNull();
		expect(screen.getByTestId('doctor-detail-specializations-domain-d').textContent).not.toMatch(
			/\b0\b/u
		);
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
						description: `<script>alert(1)</script>${evil}`,
						isSpecialized: true
					})
				]
			}),
			'services'
		);
		expect(window.querySelector('img, script')).toBeNull();
		expect(window).toHaveTextContent(evil);
		expect(document.querySelector('[data-testid="doctor-detail-service-cost"] img')).toBeNull();
		await tick();
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
