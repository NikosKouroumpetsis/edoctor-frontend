import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { queryOptions } from '@tanstack/svelte-query';
import { pushState, replaceState } from '$app/navigation';
import type { ResolvedPathname } from '$app/types';
import { page } from '$app/state';
import type { DoctorAvailabilitySlotsRequest } from '$modules/doctor/api/availability';
import { mapDoctorProfile, type DoctorProfile } from '$modules/doctor/api/profile';
import { SAMPLE_NOW, sampleDoctorProfile } from '$modules/doctor/lib/detail/detail.sample';
import type { DoctorDetailPageProps } from '../types';
import ErrorPage from './error.svelte';
import Harness from './doctor-detail.harness.svelte';
import WindowPhotos from '../components/window-photos.svelte';

// The browser's reads of the page: stand-ins that answer FACTS, so the page never calls out of the test.
const { times, modes, reads } = vi.hoisted(() => ({
	times: { value: {} as Record<string, Record<string, number[]>> },
	modes: { value: {} as Record<string, 'AUTO' | 'MANUAL'> },
	reads: { office: vi.fn(), area: vi.fn() }
}));
vi.mock('$modules/doctor/api/availability', async (importOriginal) => {
	const original = await importOriginal<typeof import('$modules/doctor/api/availability')>();
	const { sampleAvailability: windowOf } = await import('$modules/doctor/lib/detail/detail.sample');
	return {
		...original,
		doctorAvailabilitySlotsQuery: (request: DoctorAvailabilitySlotsRequest) =>
			queryOptions({
				queryKey: ['test-slots', request.officeId, request.doctorServiceId],
				queryFn: async () => ({
					...windowOf(request.officeId, times.value[request.officeId] ?? {}),
					confirmationMode: modes.value[request.officeId] ?? 'MANUAL'
				})
			})
	};
});
vi.mock('$modules/doctor/api/reviews', async (importOriginal) => {
	const original = await importOriginal<typeof import('$modules/doctor/api/reviews')>();
	return {
		...original,
		doctorReviewsQuery: (doctorSlug: string) =>
			queryOptions({ queryKey: ['test-reviews', doctorSlug], queryFn: async () => [] })
	};
});
vi.mock('$modules/doctor/api/office', async (importOriginal) => {
	const original = await importOriginal<typeof import('$modules/doctor/api/office')>();
	return {
		...original,
		doctorOfficeQuery: (doctorId: string, officeId: string) =>
			queryOptions({
				queryKey: ['test-office', doctorId, officeId],
				queryFn: async () => {
					reads.office(officeId);
					return {
						officeId,
						city: 'Αθήνα',
						street: 'Ερμού',
						streetNumber: '81',
						phone: '2109876543',
						latitude: 37.976,
						longitude: 23.726
					};
				}
			})
	};
});

const onSignIn = vi.fn();
const onRetry = vi.fn();

function props(
	profile: DoctorProfile,
	overrides: Partial<DoctorDetailPageProps> = {}
): DoctorDetailPageProps {
	return {
		load: { state: 'ready', profile, serverNow: SAMPLE_NOW },
		locale: 'el',
		routeSection: null,
		localize: (path) => path,
		similarHref: (search, area) =>
			`/doctors?what=${search.professionalSlug ?? ''}${area ? `&whereSlug=${area.slug}` : ''}` as ResolvedPathname,
		similarAreaQuery: (city) => ({
			queryKey: ['test-area', city],
			queryFn: async () => {
				reads.area(city);
				return city === 'Αθήνα' ? { slug: 'athina', label: 'Αθήνα' } : null;
			}
		}),
		canonicalUrl: 'https://edoctor.example/doctors/dr-athena-papadopoulou',
		alternateUrls: {
			el: 'https://edoctor.example/doctors/dr-athena-papadopoulou',
			en: 'https://edoctor.example/en/doctors/dr-athena-papadopoulou'
		},
		backHref: '/doctors',
		signedIn: false,
		onSignIn,
		...overrides
	};
}

describe('the doctor’s profile page', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'], now: SAMPLE_NOW });
		times.value = { 'off-1': { '2026-11-01': [600, 660] } };
		modes.value = {};
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou';
		page.state = {};
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		page.url.href = 'http://localhost/';
		document.head.innerHTML = '';
	});

	it('U-41.1 / U-28.4 (app = web): ONE h1 — the name — with «Ειδικότητα · Περιοχή» and the rating line; the head speaks for the page (title, description, canonical, Open Graph, JSON-LD `Physician`)', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByTestId('doctor-detail-identity-title')).toHaveTextContent(
			'Αθηνά Παπαδοπούλου'
		);
		expect(screen.getByTestId('doctor-detail-identity-subtitle')).toHaveTextContent(
			'Παθολόγος · Αθήνα'
		);
		expect(screen.getByTestId('doctor-detail-identity-reviews')).toHaveTextContent('184 κριτικές');
		await waitFor(() =>
			expect(document.title).toBe('Αθηνά Παπαδοπούλου · Παθολόγος · Αθήνα | eDoctor')
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://edoctor.example/doctors/dr-athena-papadopoulou'
		);
		expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute(
			'content',
			'https://media.example/l/1.jpg'
		);
		const jsonLd = document.head.querySelector('script[type="application/ld+json"]');
		expect(JSON.parse(jsonLd?.textContent ?? '{}')).toMatchObject({ '@type': 'Physician' });
	});

	it('U-34.3 (app = web): the sections in the application’s order, each only with data', () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		const ids = [...document.querySelectorAll('[data-section]')].map((node) =>
			node.getAttribute('data-section')
		);
		expect(ids).toEqual([
			'summary',
			'professional',
			'specializations',
			'service-cost',
			'location',
			'reviews',
			'bio'
		]);
	});

	it('U-37 (app = web): once the times answer, «Διαθεσιμότητα» joins the page after the specializations, and the bar books', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-availability')).toBeInTheDocument()
		);
		const bar = screen.getByTestId('doctor-booking-bar');
		expect(bar).toHaveAttribute('data-mode', 'book');
		expect(within(bar).getByTestId('doctor-booking-cta')).toHaveTextContent('Κράτηση');
		expect(within(bar).getByText('Αύριο · 10:00 · Νίκης 12')).toBeInTheDocument();
	});

	it('U-34.4 / U-27.4 (app = web): a guest reads «Συνδεθείτε για κόστος» — a press signs in; «Κράτηση» and the heart sign in too', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() => expect(screen.getByTestId('doctor-booking-sign-in')).toBeInTheDocument());
		await fireEvent.click(screen.getByTestId('doctor-booking-sign-in'));
		await fireEvent.click(screen.getByTestId('doctor-booking-cta'));
		await fireEvent.click(screen.getByTestId('doctor-detail-favorite'));
		expect(onSignIn).toHaveBeenCalledTimes(3);
		expect(screen.getByTestId('doctor-detail-priced-service-sign-in-svc-1')).toHaveTextContent(
			'Συνδεθείτε για κόστος'
		);
	});

	it('U-37 case 1 (app = web): no time in 4 weeks — the statement, «Δείτε παρόμοιους γιατρούς» to the same specialty in the catalogue’s area of the active office, the call as the link; never a sign-in, never «mock» — MAJOR-2 of r1', async () => {
		times.value = {};
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-booking-bar')).toHaveAttribute('data-mode', 'no-slots')
		);
		const bar = screen.getByTestId('doctor-booking-bar');
		expect(bar).toHaveTextContent('Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες 4 εβδομάδες');
		await waitFor(() =>
			expect(within(bar).getByTestId('doctor-booking-action-similar')).toHaveAttribute(
				'href',
				'/doctors?what=pathologos&whereSlug=athina'
			)
		);
		expect(reads.area).toHaveBeenCalledWith('Αθήνα');
		expect(within(bar).getByTestId('doctor-booking-action-call')).toHaveAttribute(
			'href',
			'tel:2101234567'
		);
		expect(screen.queryByTestId('doctor-detail-availability')).toBeNull();
		expect(document.body.textContent).not.toMatch(/mock/iu);
		expect(onSignIn).not.toHaveBeenCalled();
	});

	it('U-38.1 / U-37 case 2 (app = web): a doctor without services — «Τα ραντεβού κλείνονται τηλεφωνικά», no fee line anywhere, no cost section', () => {
		render(Harness, { props: props(sampleDoctorProfile({ services: [] })) });
		const bar = screen.getByTestId('doctor-booking-bar');
		expect(bar).toHaveAttribute('data-mode', 'by-phone');
		expect(bar).toHaveTextContent('Τα ραντεβού κλείνονται τηλεφωνικά');
		expect(screen.queryByTestId('doctor-booking-sign-in')).toBeNull();
		expect(screen.queryByTestId('doctor-booking-card-fee')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-service-cost')).toBeNull();
	});

	it('U-39.1 / U-39.2 (app = web): a pill makes another office the page’s ONE active office — the location follows it, its facts asked once', async () => {
		times.value = { 'off-1': { '2026-11-01': [600] }, 'off-2': { '2026-11-02': [540] } };
		render(Harness, { props: props(sampleDoctorProfile()) });
		expect(screen.getByTestId('doctor-detail-location-address')).toHaveTextContent('Νίκης 12');
		await fireEvent.click(screen.getByTestId('doctor-detail-location-tab-off-2'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-location-address')).toHaveTextContent('Ερμού 81')
		);
		expect(reads.office).toHaveBeenCalledTimes(1);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-availability-address')).toHaveTextContent('Ερμού 81')
		);
		expect(screen.getByTestId('doctor-booking-card-tab-off-2')).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	it('U-43.2 (app = web): the summary says «Άμεση επιβεβαίωση» when the ACTIVE office’s slots confirm by themselves — not for an office that does not', async () => {
		modes.value = { 'off-1': 'AUTO' };
		times.value = { 'off-1': { '2026-11-01': [600] }, 'off-2': { '2026-11-02': [540] } };
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-summary-row-response-time')).toHaveTextContent(
				'Χρόνος απόκρισης: Άμεση επιβεβαίωση'
			)
		);
		expect(screen.queryByTestId('doctor-detail-summary-row-response-rate')).toBeNull();
		await fireEvent.click(screen.getByTestId('doctor-detail-location-tab-off-2'));
		await waitFor(() =>
			expect(screen.queryByTestId('doctor-detail-summary-row-response-time')).toBeNull()
		);
	});

	it('U-43.3 (app = web): case 1 has no «Ειδοποίησέ με» anywhere — no link, no place', async () => {
		times.value = {};
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-booking-bar')).toHaveAttribute('data-mode', 'no-slots')
		);
		expect(document.querySelector('[data-testid*="notify"]')).toBeNull();
		expect(document.body.textContent).not.toMatch(/Ειδοποίησ/u);
	});

	it('Π7 (app = web): «Εμφάνιση περισσότερα» is a link to `details/description`, opened in place in its own history entry', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		const more = screen.getByTestId('doctor-detail-professional-more');
		expect(more).toHaveAttribute('href', '/doctors/dr-athena-papadopoulou/details/description');
		await fireEvent.click(more);
		expect(pushState).toHaveBeenCalledWith('/doctors/dr-athena-papadopoulou/details/description', {
			doctorDetails: { section: 'description', inPlace: true }
		});
	});

	it('Π7 (app = web): a window’s own address opens the profile with its window — the whole description, «×» named', () => {
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'description' }) });
		const window = screen.getByTestId('doctor-detail-modal');
		expect(window).toHaveAttribute('data-section', 'description');
		expect(within(window).getByTestId('doctor-detail-modal-professional-body')).toHaveTextContent(
			'Συνεργάζεται με το νοσοκομείο Ευαγγελισμός.'
		);
		expect(within(window).getByTestId('doctor-detail-modal-close')).toHaveAccessibleName(
			'Κλείσιμο'
		);
	});

	it('U-35.7 (app = web): «Πώς λειτουργούν οι κριτικές», «Εμφάνιση όλου του βιογραφικού» and the profile’s «Άρθρα» are not drawn', () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		const text = document.body.textContent ?? '';
		expect(text).not.toMatch(/Πώς λειτουργούν οι κριτικές|Εμφάνιση όλου του βιογραφικού|Άρθρα/u);
	});

	it('U-34.3 (app = web): a doctor with nothing to show keeps the identity and «Το αναλυτικό προφίλ έρχεται σύντομα» alone', () => {
		render(Harness, {
			props: props(
				sampleDoctorProfile({
					images: [],
					rating: 0,
					reviewCount: 0,
					reviewSummary: undefined,
					reviewChips: [],
					reviewSnippets: [],
					services: [],
					office: undefined,
					offices: [],
					description: undefined,
					bio: undefined,
					languages: [],
					socialLinks: [],
					licenseNumber: undefined,
					licenseObtainedDate: undefined,
					memberSince: undefined
				})
			)
		});
		expect(screen.getByTestId('doctor-detail-fallback-notice')).toHaveTextContent(
			'Το αναλυτικό προφίλ έρχεται σύντομα'
		);
		expect(document.querySelectorAll('[data-section]')).toHaveLength(0);
		expect(screen.getByTestId('doctor-detail-gallery-placeholder')).toBeInTheDocument();
	});

	it('U-34 — MINOR-6 of r1 (app = web): a profile that did not come (the route’s 503) — the error with «Δοκιμάστε ξανά», which reads it again; its own title, never indexed', async () => {
		render(ErrorPage, { props: { status: 503, locale: 'el', backHref: '/doctors', onRetry } });
		expect(screen.getByTestId('doctor-detail-error-page')).toHaveTextContent(
			'Δεν ήταν δυνατή η φόρτωση του ιατρού'
		);
		await fireEvent.click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('doctor-detail-share')).toBeNull();
		await waitFor(() =>
			expect(document.title).toBe('Δεν ήταν δυνατή η φόρτωση του ιατρού | eDoctor')
		);
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
	});

	it('MINOR-6 of r1 / U-61.1 (the prototype 09 `?v=doctor`): a profile nobody may see (the route’s 404) is the site’s status page — «Ο γιατρός δεν βρέθηκε», the way to the search, never indexed', async () => {
		render(ErrorPage, {
			props: {
				status: 404,
				locale: 'el',
				backHref: '/doctors',
				href: (path: string) => path,
				onRetry
			}
		});
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ο γιατρός δεν βρέθηκε');
		const searches = screen.getAllByRole('link', { name: 'Αναζήτηση γιατρών' });
		expect(searches.length).toBeGreaterThan(0);
		for (const link of searches) expect(link).toHaveAttribute('href', '/doctors');
		const page = screen.getByTestId('doctor-detail-error-page');
		expect(page).toHaveTextContent('Μπορεί το προφίλ να μην είναι πια διαθέσιμο.');
		expect(page).toHaveTextContent('Κωδικός σφάλματος: 404');
		expect(screen.getByText('Ωχ!')).toHaveAttribute('aria-hidden', 'true');
		expect(page.querySelector('[data-slot="status-art"]')).toHaveAttribute('data-art', 'card');
		const helpful = screen.getByRole('navigation', { name: 'Ίσως σας βοηθήσουν:' });
		expect(
			within(helpful)
				.getAllByRole('link')
				.map((link) => link.getAttribute('href'))
		).toEqual(['/', '/articles', '/help']);
		expect(screen.queryByRole('button', { name: 'Δοκιμάστε ξανά' })).toBeNull();
		await waitFor(() => expect(document.title).toBe('Ο γιατρός δεν βρέθηκε | eDoctor'));
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
	});

	it('U-34.2: without touch, share opens the web’s window with «Αντιγραφή συνδέσμου»', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await fireEvent.click(screen.getByTestId('doctor-detail-share'));
		const window = await screen.findByTestId('doctor-detail-share-window');
		expect(within(window).getByTestId('doctor-detail-share-copy')).toHaveTextContent(
			'Αντιγραφή συνδέσμου'
		);
	});

	it('Π7 (app = web): «×» of a window opened in place goes back one step in the history (its own entry) — no new address', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
		page.state = { doctorDetails: { section: 'description', inPlace: true } };
		render(Harness, { props: props(sampleDoctorProfile()) });
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-close'));
		expect(back).toHaveBeenCalledTimes(1);
		expect(replaceState).not.toHaveBeenCalled();
		back.mockRestore();
	});

	it('Π7 (app = web): «×» of a window the page was loaded with (its own address) turns the address into the profile’s, in place — never a step back out of the site', async () => {
		const back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou/details/description';
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'description' }) });
		await fireEvent.click(screen.getByTestId('doctor-detail-modal-close'));
		expect(replaceState).toHaveBeenCalledWith('/doctors/dr-athena-papadopoulou', {
			doctorDetails: null
		});
		expect(back).not.toHaveBeenCalled();
		back.mockRestore();
	});

	it('U-14.6 (app = web): `details/photos?focus=1` opens the viewer on the second photo («2 / 3»); «›» and ← move it, the address following in place (`focus`, from 0)', async () => {
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou/details/photos?focus=1';
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'photos' }) });
		const viewer = screen.getByTestId('doctor-detail-photo-viewer');
		expect(within(viewer).getByTestId('doctor-detail-photo-viewer-counter')).toHaveTextContent(
			'2 / 3'
		);
		await fireEvent.click(within(viewer).getByTestId('doctor-detail-photo-viewer-next'));
		expect(replaceState).toHaveBeenLastCalledWith(
			'/doctors/dr-athena-papadopoulou/details/photos?focus=2',
			{ doctorDetails: { section: 'photos', focus: '2', inPlace: false } }
		);
		expect(within(viewer).getByTestId('doctor-detail-photo-viewer-counter')).toHaveTextContent(
			'3 / 3'
		);
		expect(within(viewer).queryByTestId('doctor-detail-photo-viewer-next')).toBeNull();
		await fireEvent.keyDown(viewer, { key: 'ArrowLeft' });
		expect(within(viewer).getByTestId('doctor-detail-photo-viewer-counter')).toHaveTextContent(
			'2 / 3'
		);
	});

	it('U-14.6 (negative, app = web): `?focus=` that is no photo’s place opens the tour; one past the last opens the viewer on the last', () => {
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou/details/photos?focus=abc';
		const tour = render(Harness, {
			props: props(sampleDoctorProfile(), { routeSection: 'photos' })
		});
		expect(screen.getByTestId('doctor-detail-modal-photos')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-detail-photo-viewer')).toBeNull();
		expect(screen.getByTestId('doctor-detail-photos-cell-0')).toHaveAttribute(
			'href',
			'/doctors/dr-athena-papadopoulou/details/photos?focus=0'
		);
		tour.unmount();
		page.url.href = 'http://localhost/doctors/dr-athena-papadopoulou/details/photos?focus=999';
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'photos' }) });
		expect(screen.getByTestId('doctor-detail-photo-viewer-counter')).toHaveTextContent('3 / 3');
	});

	it('U-14.6 / MINOR-9 of r1: the tour’s «Κοινοποίηση» and «Αποθήκευση» are named on the phone too, where their words hide', () => {
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'photos' }) });
		expect(screen.getByTestId('doctor-detail-modal-photos-share')).toHaveAccessibleName(
			'Κοινοποίηση'
		);
		expect(screen.getByTestId('doctor-detail-modal-photos-save')).toHaveAccessibleName(
			'Αποθήκευση'
		);
	});

	it('U-14.6 — MINOR-7 of r1: «›» glides once — the address that follows the viewer never jumps it back with an instant scroll', async () => {
		const scrollTo = vi.fn();
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: scrollTo
		});
		try {
			const photos = sampleDoctorProfile().images.map((image, index) => ({
				id: image.id,
				url: image.url,
				largeUrl: image.largeUrl,
				thumbUrl: image.thumbUrl,
				alt: `Φωτογραφία ${index + 1}`
			}));
			const view = render(WindowPhotos, {
				props: {
					open: true,
					photos,
					focus: 0,
					locale: 'el',
					saved: false,
					photoHref: (index: number) => `/doctors/x/details/photos?focus=${index}` as const,
					onOpenPhoto: () => undefined,
					onPhotoChange: (index: number) => void view.rerender({ focus: index }),
					onClose: () => undefined,
					onShare: () => undefined,
					onSave: () => undefined
				}
			});
			scrollTo.mockClear();
			await fireEvent.click(screen.getByTestId('doctor-detail-photo-viewer-next'));
			await waitFor(() =>
				expect(screen.getByTestId('doctor-detail-photo-viewer-counter')).toHaveTextContent('2 / 3')
			);
			expect(scrollTo).toHaveBeenCalledTimes(1);
			expect(scrollTo.mock.calls[0]?.[0]).not.toHaveProperty('behavior', 'instant');
		} finally {
			Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
		}
	});

	it('U-37.2 — MINOR-1 of r1: `details/availability` with no time in 4 weeks shows the statement and the two ways — never a skeleton that waits for nothing', async () => {
		times.value = {};
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'availability' }) });
		const none = await screen.findByTestId('doctor-detail-modal-availability-none');
		expect(none).toHaveTextContent('Δεν υπάρχουν διαθέσιμες ώρες τις επόμενες 4 εβδομάδες');
		expect(
			within(none).getByTestId('doctor-detail-modal-availability-action-similar')
		).toBeInTheDocument();
		expect(
			within(none).getByTestId('doctor-detail-modal-availability-action-call')
		).toHaveAttribute('href', 'tel:2101234567');
		expect(screen.queryByTestId('doctor-detail-modal-loading')).toBeNull();
		expect(
			screen.getByTestId('doctor-detail-modal').querySelector('[aria-busy="true"]')
		).toBeNull();
	});

	it('U-37.2 / D-103 (negative) — MAJOR-2 of r1: a doctor with times never asks the catalogue for the similar search’s area', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-availability')).toBeInTheDocument()
		);
		expect(reads.area).not.toHaveBeenCalled();
	});

	it('U-39.1 (app = web): an office is asked once — back to it after another, nothing is asked again', async () => {
		times.value = { 'off-1': { '2026-11-01': [600] }, 'off-2': { '2026-11-02': [540] } };
		render(Harness, { props: props(sampleDoctorProfile()) });
		await fireEvent.click(screen.getByTestId('doctor-detail-location-tab-off-2'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-location-address')).toHaveTextContent('Ερμού 81')
		);
		await fireEvent.click(screen.getByTestId('doctor-detail-location-tab-off-1'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-location-address')).toHaveTextContent('Νίκης 12')
		);
		await fireEvent.click(screen.getByTestId('doctor-detail-location-tab-off-2'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-location-address')).toHaveTextContent('Ερμού 81')
		);
		expect(reads.office).toHaveBeenCalledTimes(1);
	});

	it('Π5 — NIT-1 of r1: a link of the section bar glides to its section (smooth, whatever the motion setting)', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await fireEvent.click(screen.getByTestId('doctor-detail-section-link-reviews'));
		const target = document.getElementById('doctor-reviews');
		expect(target?.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
	});

	it('U-40.3 — NIT-2 of r1 (case 3): an active office without a day draws no empty «ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ» in the card', async () => {
		times.value = { 'off-1': { '2026-11-01': [600] } };
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() => expect(screen.getByTestId('doctor-booking-card-when')).toBeInTheDocument());
		await fireEvent.click(screen.getByTestId('doctor-booking-card-tab-off-2'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-booking-card-elsewhere')).toBeInTheDocument()
		);
		expect(screen.queryByTestId('doctor-booking-card-when')).toBeNull();
	});

	it('NIT-3 of r1: the reviews window of a list that answered empty says so in one line', async () => {
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'reviews' }) });
		expect(await screen.findByTestId('doctor-detail-modal-reviews-empty')).toHaveTextContent(
			'Δεν υπάρχουν ακόμα κριτικές.'
		);
	});

	it('U-43 (app = web): the backend’s six-month metrics on a MANUAL office — «Εντός μίας ώρας», «85%» in the summary, «Ολοκληρωμένες επισκέψεις (6 μήνες): 6» over the specializations', async () => {
		render(Harness, {
			props: props(
				sampleDoctorProfile({
					responseMetrics: {
						responseTimeId: 'within-hour',
						responseRatePercent: 85,
						completedVisits: 6
					}
				})
			)
		});
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-summary-row-response-time')).toHaveTextContent(
				'Χρόνος απόκρισης: Εντός μίας ώρας'
			)
		);
		expect(screen.getByTestId('doctor-detail-summary-row-response-rate')).toHaveTextContent(
			'Ρυθμός απόκρισης: 85%'
		);
		expect(screen.getByTestId('doctor-detail-specializations-visits')).toHaveTextContent(
			'Ολοκληρωμένες επισκέψεις (6 μήνες): 6'
		);
	});

	it('U-43.1 (negative, app = web): without metrics (each `null` from the backend) no response row and no visits line', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-detail-availability')).toBeInTheDocument()
		);
		expect(screen.queryByTestId('doctor-detail-summary-row-response-time')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-summary-row-response-rate')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-specializations-visits')).toBeNull();
	});

	it('U-45.2 (app = web): a doctor the backend marks shows «Επιλογή ασθενών» — the laurels in the identity and over the reviews', () => {
		render(Harness, { props: props(sampleDoctorProfile({ isPatientsChoice: true })) });
		expect(screen.getByTestId('doctor-detail-identity-badge')).toHaveTextContent('Επιλογή ασθενών');
		const header = screen.getByTestId('doctor-detail-review-score-header');
		expect(header).toHaveAttribute('data-slot', 'review-summary');
		expect(header).toHaveTextContent('Επιλογή ασθενών');
	});

	it('U-45.2 (negative) — αντικαθίσταται από U-45.2 ο κανόνας «κάθε γιατρός με κριτικές»: a rated doctor the backend does not mark has no laurels — the plain «★ 4,90 · 184 κριτικές»', () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		expect(screen.getByTestId('doctor-detail-identity-reviews')).toHaveTextContent('184 κριτικές');
		expect(screen.queryByTestId('doctor-detail-identity-badge')).toBeNull();
		const header = screen.getByTestId('doctor-detail-review-score-header');
		expect(header).not.toHaveAttribute('data-slot', 'review-summary');
		expect(header).toHaveTextContent('4,90');
		expect(screen.getByTestId('doctor-detail-review-score-star')).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/Επιλογή ασθενών/u);
	});

	it('U-49 (app = web): every score on the page is on the 5 stars — the identity, the chips, the reviews', async () => {
		render(Harness, { props: props(sampleDoctorProfile(), { routeSection: 'reviews' }) });
		await screen.findByTestId('doctor-detail-modal-reviews-empty');
		const decimals = (document.body.textContent ?? '').match(/\d+,\d+/gu) ?? [];
		expect(decimals.length).toBeGreaterThan(0);
		for (const value of decimals) expect(Number(value.replace(',', '.'))).toBeLessThanOrEqual(5);
	});

	it('U-49 (negative): a profile answered on the old 1–10 scale shows no score above 5 — no rating line, no chip, no review with it', () => {
		const profile = mapDoctorProfile(
			{
				pricingVisible: false,
				doctor: {
					doctorId: 'doc-old',
					slug: 'dr-old-scale',
					fullName: 'Νίκος Παλαιός',
					professional: { id: 'pro-1', name: 'Παθολόγος', slug: 'pathologos' },
					images: [],
					services: [],
					rating: { average: 9.2, count: 12, aspectAverages: { trustRating: 9.6 } },
					reviewsPreview: [
						{
							id: 'rev-old',
							comment: 'Παλιά κλίμακα.',
							patientName: 'Νίκος Π.',
							patientInitial: 'Ν',
							createdAt: '2026-10-01T10:00:00Z',
							overallRating: 8.56,
							aspect: { trustRating: 9 }
						}
					]
				}
			} as never,
			{ slug: 'dr-old-scale', lang: 'el' }
		);
		render(Harness, { props: props(profile) });
		expect(screen.queryByTestId('doctor-detail-identity-rating')).toBeNull();
		expect(screen.queryByTestId('doctor-detail-review-chips')).toBeNull();
		const text = document.body.textContent ?? '';
		expect(text).not.toMatch(/9,2|9,6|8,5|8,6/u);
		for (const value of text.match(/\d+,\d+/gu) ?? []) {
			expect(Number(value.replace(',', '.'))).toBeLessThanOrEqual(5);
		}
	});

	it('U-49 — r4 (app = web): a 4,28 review draws 4 whole stars on its card (as the spread counts it), never 5', () => {
		render(Harness, {
			props: props(
				sampleDoctorProfile({
					reviewSnippets: [
						{
							id: 'rev-r4',
							body: 'Καλή εμπειρία.',
							patientName: 'Μαρία Κ.',
							patientInitial: 'Μ',
							publishedAt: '2026-09-12T10:00:00Z',
							rating: 4.28
						}
					]
				})
			)
		});
		const rail = screen.getByTestId('doctor-detail-review-rail');
		expect(rail.querySelectorAll('[data-filled="true"]')).toHaveLength(4);
		expect(rail.querySelectorAll('[data-filled="false"]')).toHaveLength(1);
	});

	it('U-34.2 — r5 (app = web): the phone’s bar has «‹» at the start and share · heart side by side at the end, both in the row’s flow — no target placed over another — r6: the three glyphs 20 (`icon-md`) as the application’s, in 48 targets', async () => {
		render(Harness, { props: props(sampleDoctorProfile()) });
		const bar = screen.getByTestId('doctor-detail-sticky-header');
		const trailing = bar.querySelector('[data-slot="sticky-top-bar-trailing"]') as HTMLElement;
		expect(trailing).toHaveClass('flex', 'flex-row', 'items-center', 'gap-2');
		const targets = [...trailing.children] as HTMLElement[];
		expect(targets.map((node) => node.dataset.testid)).toEqual([
			'doctor-detail-share',
			'doctor-detail-favorite'
		]);
		for (const node of targets) {
			expect(node).toHaveAttribute('data-slot', 'icon-button');
			expect(node.className).not.toMatch(/(^|\s)(absolute|fixed|sticky|top-|right-|left-|inset-)/u);
		}
		expect(bar.querySelector('[data-slot="favorite-button"]')).toBeNull();
		const heart = screen.getByTestId('doctor-detail-favorite');
		expect(heart).toHaveAccessibleName('Αποθήκευση γιατρού');
		expect(heart).toHaveAttribute('aria-pressed', 'false');
		expect(
			bar.querySelector('[data-slot="sticky-top-bar-leading"] [data-testid="doctor-detail-back"]')
		).not.toBeNull();
		for (const id of ['doctor-detail-back', 'doctor-detail-share', 'doctor-detail-favorite']) {
			const target = screen.getByTestId(id);
			expect(target.querySelector('[data-slot="icon-button-shape"]')).toHaveClass('size-touch');
			const glyph = target.querySelector('svg');
			expect(glyph).toHaveClass('icon-md');
			expect(glyph).not.toHaveClass('icon-lg');
		}
	});
});
