import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { DoctorStanding, type DoctorStandingKind } from '$shared/state/doctor-standing';
import { ToastState } from '$shared/ui/molecules/toast';
import type { DoctorOnboardingProgress } from '$modules/doctor-onboarding/api/progress';
import type { DoctorOnboardingScreen } from '$modules/doctor-onboarding/lib/steps';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import type { OnboardingDraft } from '$modules/doctor-onboarding/ui/draft-host';
import Harness from './onboarding.harness.svelte';
import type { DoctorOnboardingContext } from '../types';

/*
 * 🔴 Wave 5.1 · screen 64 (U-183.5, D-W51-16, D-W51-17): the application's page of a COMPLETED registration without a
 * licence, and «Επεξεργασία» — the same step with «Ακύρωση / Αποθήκευση», back on the page once saved. The server is
 * stubbed; the doctor standing is the layout host's.
 */
type Call = { path: string; method: string; body?: unknown };
let calls: Call[];
let server: DoctorOnboardingProgress;

const json = (data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});

const PROFESSIONS = [
	{ id: 'p-card', key: 'cardiology', translations: [{ language: 'el', name: 'Καρδιολόγος' }] }
];

const context: DoctorOnboardingContext = {
	locale: 'el',
	href: (path) => path,
	helpHref: '/help',
	homeHref: '/',
	profileHref: '/profile',
	readCodeFailure: () => 'unknown',
	toPhoneNumber: (typed) => typed.trim() || null,
	showPhoneNumber: (stored) => stored.replace(/^\+30/u, '')
};

/** A finished sign-up, every field answered (made-up facts, no person's). */
const completed = (): DoctorOnboardingProgress =>
	doctorOnboardingProgressSample({
		state: 'COMPLETED',
		deleteAfter: null,
		completedAt: '2026-11-10T10:00:00.000Z',
		missing: [],
		basicInfo: {
			firstName: 'Ελένη',
			lastName: 'Παππά',
			dateOfBirth: '1980-05-12',
			gender: 'FEMALE'
		},
		contactEmail: { notificationEmailMasked: 'e***a@example.gr', verified: true },
		professional: { professionalId: 'p-card', licenseNumber: '48213', licenseObtainedDate: null },
		office: {
			streetLine: 'Λεωφ. Κηφισίας 120',
			postalCode: '11526',
			city: 'Αθήνα',
			latitude: 37.99,
			longitude: 23.77,
			placeId: null,
			pinMoved: false,
			phone: '+302101234567',
			floor: 3,
			gettingThere: 'Είσοδος από πίσω.',
			parking: false,
			parkingKinds: [],
			disabilityAccess: true,
			accessibleToilet: false,
			accessibleParking: false,
			elevator: true,
			nearPublicTransport: true,
			paymentOptions: ['CASH', 'CARD', 'IRIS']
		},
		servicePricing: { price: 60, customDurationInMinutes: 30 },
		calendar: { category: 'GOOGLE' },
		liability: {
			liabilityInsurance: true,
			liabilityCompany: 'Ασφαλιστική',
			liabilityInsuranceExpiresAt: '2027-12-31T10:00:00.000Z'
		},
		terms: { accepted: true, version: '1.0' },
		activationIntent: { wantsMarketplace: true, wantsAppointments: true, wantsPayments: false }
	});

const standingOf = (kind: DoctorStandingKind | 'unknown') =>
	new DoctorStanding({
		facts: () =>
			kind === 'unknown' ? undefined : { kind, notice: null, lastMode: 'PATIENT', card: null },
		switchTo: async () => true
	});

beforeEach(() => {
	calls = [];
	server = completed();
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const path = new URL(url).pathname.replace(/^\/api\/v\d+/u, '');
			const body = init.body ? JSON.parse(String(init.body)) : undefined;
			calls.push({ path, method, body });
			if (path === '/professional/professionals') return json(PROFESSIONS);
			if (path.endsWith('/verification-code')) return json({ success: true });
			return json(server);
		})
	);
	page.state = {};
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	(page as { url: URL }).url = new URL('http://localhost/');
	page.state = {};
});

function draw(
	screenName: DoctorOnboardingScreen,
	{
		kind = 'pending',
		address,
		depth = 0,
		prepare
	}: {
		kind?: DoctorStandingKind | 'unknown';
		address?: string;
		depth?: number;
		prepare?: (draft: OnboardingDraft) => void;
	} = {}
) {
	(page as { url: URL }).url = new URL(address ?? '/doctor/onboarding', 'http://localhost');
	page.state = depth ? { onboarding: { depth } } : {};
	const toasts = new ToastState();
	const back = vi.spyOn(history, 'go').mockImplementation(() => {});
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				start: 'member',
				screen: screenName,
				context,
				toasts,
				standing: standingOf(kind),
				onReady: (ready: { draft: OnboardingDraft }) => prepare?.(ready.draft)
			}
		}
	});
	return { toasts, back };
}

const writes = () => calls.filter((call) => call.method !== 'GET');
const user = () => userEvent.setup({ delay: null });

describe('the application’s page (U-183.5, D-W51-17)', () => {
	it('U-183.5: a COMPLETED registration without a licence reads «Σε έλεγχο», the end’s words and its fields in three sections, each with «Επεξεργασία»', async () => {
		draw('overview');
		const pageNode = await screen.findByTestId('doctor-onboarding-application');
		expect(screen.getByTestId('doctor-onboarding-application-state')).toHaveTextContent(
			'Σε έλεγχο'
		);
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Λάβαμε την αίτησή σας');
		expect(pageNode).toHaveTextContent(
			'Ένας συνεργάτης του eDoctor θα επικοινωνήσει μαζί σας για να ελέγξει τα στοιχεία σας. Μόλις ενεργοποιηθεί ο λογαριασμός σας, θα σας ενημερώσουμε με email.'
		);
		expect(screen.getByTestId('doctor-onboarding-application-only')).toHaveTextContent(
			'Μέχρι να ενεργοποιηθεί ο λογαριασμός σας, αλλάζετε μόνο τα στοιχεία της εγγραφής.'
		);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-onboarding-application-row-specialty')).toHaveTextContent(
				'Καρδιολόγος · Άδεια 48213'
			)
		);
		const rowOf = (id: string) => screen.getByTestId(`doctor-onboarding-application-row-${id}`);
		expect(rowOf('basic')).toHaveTextContent('Ελένη Παππά · 12 Μαΐου 1980 · Γυναίκα');
		expect(rowOf('location')).toHaveTextContent('Λεωφ. Κηφισίας 120, 11526 Αθήνα');
		expect(rowOf('office')).toHaveTextContent('2101234567 · 3ος όροφος · οδηγίες');
		expect(rowOf('amenities')).toHaveTextContent(
			'Πρόσβαση ΑμεΑ · Ανελκυστήρας · Κοντά σε μέσα μεταφοράς'
		);
		expect(rowOf('payments')).toHaveTextContent('Μετρητά · Κάρτα · IRIS');
		expect(rowOf('price')).toHaveTextContent('60 € · 30 λεπτά');
		expect(rowOf('calendar')).toHaveTextContent('Google Calendar');
		expect(rowOf('terms')).toHaveTextContent('Ναι · λήγει 31 Δεκεμβρίου 2027');
		expect(rowOf('access')).toHaveTextContent('Προφίλ στην αναζήτηση · Online ραντεβού');
		expect(
			[0, 1, 2].map(
				(index) =>
					screen.getByTestId(`doctor-onboarding-application-section-${index}`).querySelector('h2')
						?.textContent
			)
		).toEqual(['Πείτε μας για εσάς', 'Το ιατρείο σας', 'Τελειώνουμε']);
		expect(screen.getByTestId('doctor-onboarding-application-edit-price')).toHaveAttribute(
			'href',
			'/doctor/onboarding/price?edit=1'
		);
		expect(screen.getByTestId('doctor-onboarding-application-edit-price')).toHaveAccessibleName(
			'Επεξεργασία: Τιμή και διάρκεια'
		);
		expect(pageNode).toHaveTextContent('Οι όροι γιατρών που αποδεχτήκατε δεν αλλάζουν από εδώ.');
		expect(screen.getByTestId('doctor-onboarding-application-back')).toHaveAttribute(
			'href',
			'/profile'
		);
		// The overview's own message and button are gone (it took their place).
		expect(screen.queryByTestId('doctor-onboarding-notice')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-start')).toBeNull();
	});

	it('🔴 U-169: the contact email only as the server hides it', async () => {
		draw('overview');
		expect(await screen.findByTestId('doctor-onboarding-application-row-email')).toHaveTextContent(
			'e***a@example.gr'
		);
	});

	it('«Επεξεργασία» opens the same step as one more page, its address `?edit=1`', async () => {
		draw('overview');
		await user().click(await screen.findByTestId('doctor-onboarding-application-edit-price'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/onboarding/price?edit=1', {
			state: { onboarding: { depth: 1 } }
		});
	});

	it('(negative) a licensed registration reads the overview as before; one still judged waits — never the one, then the other', async () => {
		draw('overview', { kind: 'doctor' });
		expect(await screen.findByTestId('doctor-onboarding-notice')).toHaveTextContent(
			'Η εγγραφή σας έχει ολοκληρωθεί.'
		);
		expect(screen.queryByTestId('doctor-onboarding-application')).toBeNull();
	});

	it('(negative) the standing not known yet: the wait, neither page', async () => {
		draw('overview', { kind: 'unknown' });
		await waitFor(() =>
			expect(calls.some((call) => call.path === '/doctor/onboarding')).toBe(true)
		);
		expect(await screen.findByTestId('doctor-onboarding-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('doctor-onboarding-application')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-notice')).toBeNull();
	});
});

describe('«Επεξεργασία» (U-183.5: μόνο σε COMPLETED χωρίς άδεια)', () => {
	it('U-183.5: the same step with only «Ακύρωση» and «Αποθήκευση», no stages’ bar, no «Αποθήκευση και έξοδος»; «Αποθήκευση» writes and goes back, saying so', async () => {
		const { toasts, back } = draw('price', {
			address: '/doctor/onboarding/price?edit=1',
			depth: 1
		});
		const save = await screen.findByTestId('doctor-onboarding-next');
		await waitFor(() => expect(save).toHaveTextContent('Αποθήκευση'));
		expect(screen.getByTestId('doctor-onboarding-cancel')).toHaveTextContent('Ακύρωση');
		expect(screen.queryByTestId('doctor-onboarding-back')).toBeNull();
		expect(screen.queryByRole('progressbar')).toBeNull();
		expect(screen.queryByTestId('doctor-onboarding-save-exit')).toBeNull();
		await user().click(
			within(screen.getByTestId('doctor-onboarding-durations')).getByText('45 λεπτά')
		);
		await user().click(save);
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/service-pricing',
				method: 'POST',
				body: { price: 60, customDurationInMinutes: 45 }
			}
		]);
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
	});

	it('«Ακύρωση» writes nothing, forgets the words and goes back; opened from a link (no history) the application’s page takes its place', async () => {
		let kept: OnboardingDraft | undefined;
		const { back } = draw('price', {
			address: '/doctor/onboarding/price?edit=1',
			depth: 1,
			prepare: (draft) => (kept = draft)
		});
		await screen.findByTestId('doctor-onboarding-cancel');
		kept?.update('servicePricing', { price: '70' });
		await user().click(screen.getByTestId('doctor-onboarding-cancel'));
		expect(back).toHaveBeenCalledWith(-1);
		expect(writes()).toEqual([]);
		expect(kept?.dirty).toBe(false);
	});

	it('opened with no history behind it, «Ακύρωση» puts the application’s page in its place', async () => {
		draw('price', { address: '/doctor/onboarding/price?edit=1' });
		await user().click(await screen.findByTestId('doctor-onboarding-cancel'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/onboarding', {
			replaceState: true,
			state: { onboarding: { depth: 0 } }
		});
	});

	it('the email: the current address as its mask, a new one asked; «Συνέχεια» to its code (still the edit), whose «Αποθήκευση» verifies and goes back', async () => {
		draw('email', { address: '/doctor/onboarding/email?edit=1', depth: 1 });
		expect(await screen.findByTestId('doctor-onboarding-email-current')).toHaveTextContent(
			'Τρέχον email: e***a@example.gr'
		);
		expect(screen.getByTestId('doctor-onboarding-email-field')).toHaveValue('');
		expect(screen.getByTestId('doctor-onboarding-next')).toHaveTextContent('Συνέχεια');
		await user().type(screen.getByTestId('doctor-onboarding-email-field'), 'new@example.gr');
		await user().click(screen.getByTestId('doctor-onboarding-next'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/onboarding/email/code?edit=1', {
				replaceState: false,
				state: { onboarding: { depth: 2 } }
			})
		);
	});

	it('the email’s code ends the edit: «Αποθήκευση» sends the typed address with the code, then back past both pages', async () => {
		const { back } = draw('email-code', {
			address: '/doctor/onboarding/email/code?edit=1',
			depth: 2,
			prepare: (draft) => draft.update('contactEmail', { notificationEmail: 'new@example.gr' })
		});
		const save = await screen.findByTestId('doctor-onboarding-next');
		await waitFor(() => expect(save).toHaveTextContent('Αποθήκευση'));
		await user().type(screen.getByTestId('doctor-onboarding-code-input'), '123456');
		await user().click(save);
		await waitFor(() => expect(back).toHaveBeenCalledWith(-2));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/notification-email/verify',
				method: 'POST',
				body: { notificationEmail: 'new@example.gr', code: '123456' }
			}
		]);
	});

	it('U-183.5 · D-W51-12: the terms change only the insurance — no acceptance asked, shown or written', async () => {
		const { back } = draw('terms', { address: '/doctor/onboarding/terms?edit=1', depth: 1 });
		await screen.findByTestId('doctor-onboarding-insurance');
		expect(screen.queryByText('Αποδοχή όρων')).toBeNull();
		await user().click(screen.getByTestId('doctor-onboarding-next'));
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(writes()).toEqual([
			{
				path: '/doctor/onboarding/liability',
				method: 'POST',
				body: {
					liabilityInsurance: true,
					liabilityCompany: 'Ασφαλιστική',
					liabilityInsuranceExpiresAt: expect.any(String)
				}
			}
		]);
		expect(JSON.stringify(writes())).not.toContain('legalAcceptance');
	});

	it('the access: what to turn on alone — no call of a team member, never «Ολοκλήρωση» again', async () => {
		const { back } = draw('access', { address: '/doctor/onboarding/access?edit=1', depth: 1 });
		const save = await screen.findByTestId('doctor-onboarding-next');
		await waitFor(() => expect(save).toHaveTextContent('Αποθήκευση'));
		expect(screen.queryByTestId('doctor-onboarding-contact')).toBeNull();
		await user().click(save);
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(writes().map((call) => call.path)).toEqual(['/doctor/onboarding/activation-intent']);
	});

	it('the address keeps its sub-flow: «Επόμενο» from the address to its confirmation, still the edit', async () => {
		draw('location', { address: '/doctor/onboarding/location?edit=1', depth: 1 });
		const next = await screen.findByTestId('doctor-onboarding-next');
		await waitFor(() => expect(next).not.toBeDisabled());
		expect(next).toHaveTextContent('Επόμενο');
		await user().click(next);
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/onboarding/location/confirm?edit=1', {
			replaceState: false,
			state: { onboarding: { depth: 2 } }
		});
	});

	it('U-183.5 (negative): `?edit=1` on a licensed registration — the normal flow, its overview', async () => {
		draw('price', { kind: 'doctor', address: '/doctor/onboarding/price?edit=1', depth: 1 });
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/onboarding', {
				replaceState: true,
				state: { onboarding: { depth: 0 } }
			})
		);
		expect(writes()).toEqual([]);
	});

	it('U-183.5 (negative): `?edit=1` on a sign-up in progress — the normal step («Πίσω / Επόμενο», the stages’ bar)', async () => {
		server = doctorOnboardingProgressSample({ missing: ['SERVICE_PRICING', 'CALENDAR'] });
		draw('price', { kind: 'none', address: '/doctor/onboarding/price?edit=1', depth: 1 });
		const next = await screen.findByTestId('doctor-onboarding-next');
		await waitFor(() => expect(screen.queryByTestId('doctor-onboarding-loading')).toBeNull());
		expect(next).toHaveTextContent('Επόμενο');
		expect(screen.getByTestId('doctor-onboarding-back')).toHaveTextContent('Πίσω');
		expect(screen.queryByTestId('doctor-onboarding-cancel')).toBeNull();
		expect(screen.getByTestId('doctor-onboarding-save-exit')).toBeInTheDocument();
	});
});
