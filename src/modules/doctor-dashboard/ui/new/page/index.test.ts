import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { page as appPage } from '$app/state';
import { resetServerClock } from '$shared/lib/server-clock';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	doctorAppointmentDetailRow,
	TODAY_NOW
} from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { DoctorAppointmentMemory } from '$modules/doctor-dashboard/ui/memory';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import Harness from './new.harness.svelte';

/*
 * Wave 5.1 · screen 72 «Νέο ραντεβού» (D-W51-69 / 70; card w51-w8): the page with the server stubbed at `fetch` (the
 * module's precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up people and ids only.
 */

const DOCTOR = '0193d000-0000-7000-8000-0000000000d1';
const KIFISIAS = '0193d000-0000-7000-8000-0000000000f1';
const PATISION = '0193d000-0000-7000-8000-0000000000f2';
const VISIT = '0193d000-0000-7000-8000-0000000000e1';
const CHECK = '0193d000-0000-7000-8000-0000000000e2';
const P1 = '0193d000-0000-7000-8000-0000000000b1';
const R3 = '0193d000-0000-7000-8000-0000000000b3';
const REL = '0193d000-0000-7000-8000-0000000000b4';
const HOLDER = '0193d000-0000-7000-8000-0000000000b5';
const NEW_ID = '0193d000-0000-7000-8000-0000000000a9';
const SLOT_1 = '2026-11-16T07:00:00.000Z';
const SLOT_2 = '2026-11-16T07:30:00.000Z';

const officeRow = (id: string, street: string, number: string, city: string) => ({
	doctorOffice: { id: `link-${id}`, doctorId: DOCTOR, officeId: id, createdAt: '', updatedAt: '' },
	office: {
		id,
		postalCode: '11526',
		translations: [{ language: 'el', street, streetNumber: number, city }]
	}
});
const ONE_OFFICE = [officeRow(KIFISIAS, 'Λεωφ. Κηφισίας', '120', 'Αθήνα')];
const TWO_OFFICES = [...ONE_OFFICE, officeRow(PATISION, 'Πατησίων', '45', 'Αθήνα')];
const SERVICES = [
	{ id: VISIT, title: 'Επίσκεψη', customDurationInMinutes: 30, price: 60 },
	{ id: CHECK, title: 'Επανέλεγχος', customDurationInMinutes: 20, price: 45 }
];

const visits = (count: number, lastAt: string | null) => ({ count, firstAt: lastAt, lastAt });
const ACCOUNT = {
	key: { kind: 'account', id: P1 },
	person: { kind: 'ACCOUNT', patientId: P1, relativeId: null },
	firstName: 'Ιωάννα',
	lastName: 'Καρρά',
	phone: '306977654321',
	email: 'ioanna.karra@seed.edoctor.test',
	hasAccount: true,
	bookedBy: null,
	next: null,
	visits: visits(4, '2026-10-22T08:00:00.000Z'),
	noShows: 0
};
const RECORD = {
	key: { kind: 'record', id: R3 },
	person: { kind: 'RECORD', recordId: R3 },
	firstName: 'Καλλιόπη',
	lastName: 'Ζέρβα',
	phone: '306971002003',
	email: null,
	hasAccount: false,
	bookedBy: null,
	next: null,
	visits: visits(1, '2026-11-02T10:00:00.000Z'),
	noShows: 0
};
const RELATIVE = {
	key: { kind: 'relative', id: REL },
	person: { kind: 'ACCOUNT', patientId: HOLDER, relativeId: REL },
	firstName: 'Νίκος',
	lastName: 'Μαυρίδης',
	phone: null,
	email: null,
	hasAccount: true,
	bookedBy: { firstName: 'Ελένη', lastName: 'Μαυρίδη', relationship: 'CHILD' },
	next: null,
	visits: visits(0, null),
	noShows: 0
};

const SLOTS = {
	officeId: KIFISIAS,
	timezone: 'Europe/Athens',
	durationMinutes: 30,
	slotsByDate: [
		{ date: '2026-11-14', slots: [] },
		{
			date: '2026-11-16',
			slots: [SLOT_1, SLOT_2].map((startTime) => ({
				startTime,
				endTime: new Date(Date.parse(startTime) + 30 * 60_000).toISOString()
			}))
		}
	]
};

type Write = {
	status: number;
	message?: string;
	error?: boolean;
	wait?: Promise<void>;
};
let calls: { method: string; url: URL; body: unknown }[] = [];
let server: {
	offices: unknown[];
	smsOn: boolean;
	balance: number | null;
	recent: unknown[];
	search: unknown[];
	phone: unknown[];
	card: { status: number; body?: unknown };
	write?: Write;
	answer?: unknown;
};

const envelope = (data: unknown, status = 200, message = 'refused') =>
	new Response(
		status < 400
			? JSON.stringify({ status: 'success', message: '', data })
			: JSON.stringify({ errorCode: 'EC', errorMessage: message }),
		{ status }
	);

function serve(next: Partial<typeof server> = {}) {
	server = {
		offices: ONE_OFFICE,
		smsOn: true,
		balance: 118,
		recent: [ACCOUNT, RECORD, RELATIVE],
		search: [],
		phone: [],
		card: { status: 404 },
		...next
	};
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : null });
			const path = url.pathname;
			if (method === 'POST') {
				const write = server.write ?? { status: 201 };
				if (write.wait) await write.wait;
				if (write.error) throw new TypeError('Failed to fetch');
				return envelope(
					server.answer ??
						doctorAppointmentDetailRow({ id: NEW_ID, status: 'booked', patientKind: 'RECORD' }),
					write.status,
					write.message
				);
			}
			if (path.endsWith('/doctor/profile/offices')) return envelope(server.offices);
			if (path.endsWith('/doctor-service/doctor-services')) return envelope(SERVICES);
			if (path.endsWith('/notification/settings/me')) {
				return envelope({ doctorId: DOCTOR, smsPatientConfirmed: server.smsOn });
			}
			if (path.endsWith('/notification/sms-packages/me')) {
				return envelope({ doctorId: DOCTOR, remainingUnits: server.balance });
			}
			if (path.endsWith('/appointment/doctor/patients/phone-match')) {
				return envelope({ items: server.phone, nextCursor: null });
			}
			if (path.endsWith('/appointment/doctor/patients')) {
				return envelope({
					items: url.searchParams.get('q') ? server.search : server.recent,
					nextCursor: null
				});
			}
			if (/\/appointment\/doctor\/patients\/(?:account|relative|record)\//u.test(path)) {
				return envelope(server.card.body ?? null, server.card.status);
			}
			if (path.endsWith('/appointment/doctor/slots')) return envelope(SLOTS);
			return envelope(null, 404);
		})
	);
}

const LINKS = {
	back: '/doctor/appointments',
	appointment: (id: string) => `/doctor/appointments/${id}`
};

function open(props: { from?: 'list' | 'today'; patient?: { kind: 'record'; id: string } } = {}) {
	const toasts = new ToastState();
	const memory = new DoctorAppointmentMemory();
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	render(Harness, { props: { toasts, client, links: LINKS, memory, ...props } });
	return { client, memory };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const frame = () => screen.getByTestId('doctor-new');
const ready = () =>
	waitFor(() => expect(screen.getByTestId('doctor-new-patients')).toBeInTheDocument());
const rows = () => within(screen.getByTestId('doctor-new-patients')).getAllByRole('button');
const row = (text: string) =>
	rows().find((button) => button.textContent?.includes(text)) as HTMLElement;
const submit = () => screen.getByTestId('doctor-new-submit');
const posts = () => calls.filter((call) => call.method === 'POST');
const reads = (end: string) =>
	calls.filter((call) => call.method === 'GET' && call.url.pathname.endsWith(end));
const service = (name: string) =>
	within(screen.getByTestId('doctor-new-services')).getByRole('radio', {
		name: new RegExp(name, 'u')
	});
const pickHour = async (startTime = SLOT_1) => {
	await waitFor(() =>
		expect(screen.getByTestId(`doctor-new-slot-${startTime}`)).toBeInTheDocument()
	);
	await user().click(screen.getByTestId(`doctor-new-slot-${startTime}`));
};
const fill = async (field: string, value: string) => {
	const input = screen.getByTestId(`doctor-new-${field}`);
	await user().clear(input);
	if (value) await user().type(input, value);
	await fireEvent.blur(input);
};

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
	appPage.state = {};
	vi.mocked(goto).mockClear();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	appPage.state = {};
});

describe('🔴 the guards of the contract (card w51-w8)', () => {
	it('🔴 U-102: «Νέο ραντεβού» = οθόνη, όχι φύλλο — from «Ραντεβού» the split’s centre, from «Σήμερα» alone in the middle; the slice imports no window, sheet or drawer', async () => {
		serve();
		open();
		await ready();
		expect(frame()).toHaveAttribute('data-slot', 'step-screen');
		expect(frame()).toHaveAttribute('data-placement', 'centred');
		expect(frame().tagName).toBe('SECTION');
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Νέο ραντεβού');
		expect(frame()).toHaveTextContent('Για ασθενή που σας τηλεφωνεί ή είναι στο ιατρείο.');
		expect(
			document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal]')
		).toBeNull();
		const sources: string[] = [];
		const walk = (folder: string) => {
			for (const entry of readdirSync(folder)) {
				const path = join(folder, entry);
				if (statSync(path).isDirectory()) walk(path);
				else if (!/\.test\.ts$|harness\.svelte$/u.test(entry)) sources.push(path);
			}
		};
		walk(join(projectRoot, 'src/modules/doctor-dashboard/ui/new'));
		expect(sources.length).toBeGreaterThan(3);
		for (const path of sources) {
			expect(readFileSync(path, 'utf8'), path).not.toMatch(
				/action-dialog|info-dialog|modal-screen|primitives\/(?:sheet|drawer|dialog)|bottom-sheet|role="dialog"/u
			);
		}
	});

	it('D-W51-69: from «Σήμερα» the one column in the middle at every width (`w-picked-1440.png`)', async () => {
		serve();
		open({ from: 'today' });
		await ready();
		expect(frame()).toHaveAttribute('data-placement', 'solo');
	});

	it('🔴 U-197.2: το ραντεβού του γιατρού κλείνεται επιβεβαιωμένο — the ONE write is `booked`, with the doctor, the office, ONE service and the hour; then its 68 with «Το ραντεβού κλείστηκε.»', async () => {
		serve();
		const { client, memory } = open();
		await ready();
		await user().click(row('Ιωάννα Καρρά'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		const summary = screen.getByTestId('doctor-new-summary');
		expect(summary).toHaveTextContent('Το ραντεβού κλείνεται επιβεβαιωμένο.');
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]?.url.pathname).toMatch(/\/appointment\/appointments$/u);
		expect(posts()[0]?.body).toEqual({
			doctorId: DOCTOR,
			officeId: KIFISIAS,
			startTime: SLOT_1,
			status: 'booked',
			services: [{ doctorServiceId: VISIT }],
			patientId: P1,
			bookedForType: 'SELF'
		});
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/appointments/${NEW_ID}`, {
				replaceState: true
			})
		);
		expect(client.getQueryData(doctorDashboardQueryKeys.detail(NEW_ID))).toMatchObject({
			id: NEW_ID,
			status: 'booked'
		});
		expect(memory.doneOf(NEW_ID)).toEqual({ kind: 'booked', told: ['app', 'email', 'sms'] });
	});

	it('🔴 U-197.3: νέος ασθενής = όνομα, επώνυμο, κινητό (υποχρεωτικά) + email προαιρετικό — only those travel, checked before the write', async () => {
		serve({ smsOn: false });
		open();
		await ready();
		await user().click(row('Νέος ασθενής'));
		const form = screen.getByTestId('doctor-new-form');
		expect(
			within(form)
				.getAllByRole('textbox')
				.map((box) => box.getAttribute('data-testid'))
		).toEqual([
			'doctor-new-first-name',
			'doctor-new-last-name',
			'doctor-new-phone',
			'doctor-new-email'
		]);
		expect(screen.getByTestId('doctor-new-first-name')).toHaveAttribute('maxlength', '80');
		expect(screen.getByTestId('doctor-new-phone')).toHaveAttribute('maxlength', '20');
		expect(screen.getByTestId('doctor-new-email')).toHaveAttribute('maxlength', '254');
		expect(form).toHaveTextContent('Email (προαιρετικό)');
		expect(form).toHaveTextContent('Για να πάρει την επιβεβαίωση και με email.');
		expect(form).toHaveTextContent(
			'Ο ασθενής δεν αποκτά λογαριασμό eDoctor. Τον βλέπετε μόνο εσείς, στους ασθενείς σας, όπου συμπληρώνετε και ΑΜΚΑ ή ΑΦΜ όταν χρειαστεί.'
		);
		expect(form.querySelector('[data-testid*="amka"], [data-testid*="afm"]')).toBeNull();
		await user().click(service('Επίσκεψη'));
		await pickHour();
		// Without the three, the button sleeps.
		expect(submit()).toBeDisabled();
		await fill('first-name', 'Μαρία');
		await fill('last-name', 'Οικονόμου');
		await fill('phone', '+30 698 555 1212');
		await waitFor(() => expect(submit()).toBeEnabled());
		expect(screen.getByTestId('doctor-new-summary')).toHaveTextContent('Καμία');
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		const body = posts()[0]?.body as Record<string, unknown>;
		expect(body.newPatient).toEqual({
			firstName: 'Μαρία',
			lastName: 'Οικονόμου',
			phone: '+30 698 555 1212'
		});
		expect(body).not.toHaveProperty('patientId');
		expect(body).not.toHaveProperty('patientRecordId');
		expect(body).not.toHaveProperty('bookedForType');
	});
});

describe('screen 72 · «Ασθενής» (D-W51-70)', () => {
	it('the most recent on open (no words, a page of 10): initials, name, «{κινητό} · {επισκέψεις}», «Χωρίς λογαριασμό eDoctor», «Το κλείνει: …», «Νέος ασθενής» last', async () => {
		serve();
		open();
		await ready();
		const read = reads('/appointment/doctor/patients')[0];
		expect(read?.url.searchParams.has('q')).toBe(false);
		expect(read?.url.searchParams.get('limit')).toBe('10');
		expect(screen.getByTestId('doctor-new-search')).toHaveTextContent('Πρόσφατοι ασθενείς');
		const texts = rows().map((button) => button.textContent?.replace(/\s+/gu, ' ').trim());
		expect(texts[0]).toContain('ΙΚ');
		expect(texts[0]).toContain('Ιωάννα Καρρά');
		expect(texts[0]).toContain('+30 697 765 4321 · 4 επισκέψεις · τελευταία 22 Οκτωβρίου');
		expect(texts[0]).not.toContain('Χωρίς λογαριασμό eDoctor');
		expect(texts[1]).toContain('1 επίσκεψη · τελευταία 2 Νοεμβρίου');
		expect(texts[1]).toContain('Χωρίς λογαριασμό eDoctor');
		expect(texts[2]).toContain('Το κλείνει: Ελένη Μαυρίδη (γονέας)');
		expect(texts.at(-1)).toContain('Νέος ασθενής');
		expect(texts.at(-1)).toContain('Όνομα, επώνυμο και κινητό');
	});

	it('the search: quiet a moment, then the words (cut at 40, U-65.6); «Αποτελέσματα», or «Κανένας ασθενής σας με «…».» and «Νέος ασθενής» still', async () => {
		serve({ search: [RECORD] });
		open();
		await ready();
		const field = screen.getByTestId('doctor-new-search-field');
		expect(field).toHaveAttribute('maxlength', '40');
		await user().type(field, 'καρ');
		await waitFor(() =>
			expect(
				reads('/appointment/doctor/patients').some(
					(call) => call.url.searchParams.get('q') === 'καρ'
				)
			).toBe(true)
		);
		// Typing one letter at a time asks once, for the whole words.
		expect(
			reads('/appointment/doctor/patients').filter((call) => call.url.searchParams.get('q'))
		).toHaveLength(1);
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-search')).toHaveTextContent('Αποτελέσματα')
		);
		await waitFor(() => expect(rows()).toHaveLength(2));
		server.search = [];
		await user().clear(field);
		await user().type(field, 'ζζζ');
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-none')).toHaveTextContent(
				'Κανένας ασθενής σας με «ζζζ».'
			)
		);
		expect(rows().map((button) => button.textContent)).toEqual([
			expect.stringContaining('Νέος ασθενής')
		]);
	});

	it('a row chosen: its card with «Έχει λογαριασμό eDoctor» / «Χωρίς λογαριασμό eDoctor» and «Αλλαγή», which opens the search again', async () => {
		serve();
		open();
		await ready();
		await user().click(row('Καλλιόπη Ζέρβα'));
		const card = screen.getByTestId('doctor-new-picked');
		expect(card).toHaveTextContent('Χωρίς λογαριασμό eDoctor');
		expect(card).toHaveTextContent('Καλλιόπη Ζέρβα');
		expect(card).toHaveTextContent('+30 697 100 2003');
		// Its facts are the search's: nothing is read again for it.
		expect(calls.filter((call) => /patients\/record\//u.test(call.url.pathname))).toHaveLength(0);
		await user().click(screen.getByTestId('doctor-new-change'));
		await ready();
		expect(screen.queryByTestId('doctor-new-picked')).toBeNull();
	});

	it('«Νέος ασθενής»: a mobile that is not a Greek one says so under it; «Πίσω στην αναζήτηση» goes back', async () => {
		serve();
		open();
		await ready();
		await user().click(row('Νέος ασθενής'));
		await fill('phone', '2101234567');
		expect(screen.getByTestId('doctor-new-form')).toHaveTextContent(
			'Γράψτε ένα ελληνικό κινητό με 10 ψηφία.'
		);
		await fill('first-name', 'Μαρία1');
		expect(screen.getByTestId('doctor-new-form')).toHaveTextContent(
			'Συμπληρώστε ένα όνομα, μόνο με γράμματα.'
		);
		await user().click(screen.getByTestId('doctor-new-back-to-search'));
		await ready();
	});

	it('«ίδιο κινητό»: a warning, never a block — «Είναι το ίδιο πρόσωπο» chooses the one on file', async () => {
		serve({ phone: [ACCOUNT] });
		open();
		await ready();
		await user().click(row('Νέος ασθενής'));
		await fill('first-name', 'Μαρία');
		await fill('last-name', 'Καρρά');
		await fill('phone', '697 765 4321');
		await waitFor(() => expect(screen.getByTestId('doctor-new-same-phone')).toBeInTheDocument());
		expect(reads('/phone-match')[0]?.url.searchParams.get('phone')).toBe('6977654321');
		const warning = screen.getByTestId('doctor-new-same-phone');
		expect(warning).toHaveTextContent('Έχετε ήδη ασθενή με αυτό το κινητό: Ιωάννα Καρρά.');
		expect(warning).toHaveTextContent('π.χ. παιδί με το κινητό του γονιού');
		// Not a block: the new patient may still be booked.
		await user().click(service('Επίσκεψη'));
		await pickHour();
		expect(submit()).toBeEnabled();
		await user().click(screen.getByTestId('doctor-new-same-person'));
		expect(screen.getByTestId('doctor-new-picked')).toHaveTextContent('Ιωάννα Καρρά');
	});

	it('D-W51-69: `?kind=&id=` opens with that patient chosen; one not the doctor’s (404) leaves the search with «δεν βρέθηκε»', async () => {
		serve({ card: { status: 200, body: RECORD } });
		open({ patient: { kind: 'record', id: R3 } });
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-picked')).toHaveTextContent('Καλλιόπη Ζέρβα')
		);
		expect(
			calls.some((call) => call.url.pathname.endsWith(`/appointment/doctor/patients/record/${R3}`))
		).toBe(true);
		vi.unstubAllGlobals();
		serve({ card: { status: 404 } });
		document.body.innerHTML = '';
		open({ patient: { kind: 'record', id: R3 } });
		await ready();
		expect(screen.getByTestId('doctor-new-missing')).toHaveTextContent(
			'Αυτός ο ασθενής δεν βρέθηκε στους ασθενείς σας.'
		);
	});
});

describe('screen 72 · office, service, hours, summary (D-W51-70)', () => {
	it('«Ιατρείο» only with more than one — each with its whole address; the hours follow the office and the service chosen', async () => {
		serve();
		open();
		await ready();
		expect(screen.queryByTestId('doctor-new-offices')).toBeNull();
		expect(screen.getByTestId('doctor-new-hours-wait')).toHaveTextContent(
			'Διαλέξτε πρώτα υπηρεσία για να δείτε τις ώρες.'
		);
		expect(reads('/appointment/doctor/slots')).toHaveLength(0);
		expect(
			within(screen.getByTestId('doctor-new-services'))
				.getAllByRole('radio')
				.map((radio) => radio.textContent?.trim())
		).toEqual([expect.stringContaining('30 λεπτά · 60'), expect.stringContaining('20 λεπτά · 45')]);
		await user().click(service('Επανέλεγχος'));
		await waitFor(() => expect(reads('/appointment/doctor/slots')).toHaveLength(1));
		const read = reads('/appointment/doctor/slots')[0]?.url.searchParams;
		expect(read?.get('officeId')).toBe(KIFISIAS);
		expect(read?.getAll('doctorServiceIds')).toEqual([CHECK]);
		expect(read?.get('days')).toBe('7');
		expect(screen.getByTestId('doctor-new-hours-help')).toHaveTextContent(
			'Μόνο οι ώρες που είστε πραγματικά ελεύθερος/η, για τη διάρκεια της υπηρεσίας.'
		);
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
		serve({ offices: TWO_OFFICES });
		open();
		await ready();
		const offices = within(screen.getByTestId('doctor-new-offices')).getAllByRole('radio');
		expect(offices.map((radio) => radio.textContent?.replace(/\s+/gu, ' ').trim())).toEqual([
			'Λεωφ. Κηφισίας 120 Λεωφ. Κηφισίας 120, Αθήνα 11526',
			'Πατησίων 45 Πατησίων 45, Αθήνα 11526'
		]);
		expect(offices[0]).toHaveAttribute('aria-checked', 'true');
		await user().click(offices[1] as HTMLElement);
		await user().click(service('Επίσκεψη'));
		await waitFor(() =>
			expect(reads('/appointment/doctor/slots').at(-1)?.url.searchParams.get('officeId')).toBe(
				PATISION
			)
		);
	});

	it('«Ενημέρωση»: an account in the app, by email and SMS (with the balance); a record without email and the SMS off — «Καμία» and «πείτε του την ώρα στο τηλέφωνο»', async () => {
		serve();
		open();
		await ready();
		await user().click(row('Ιωάννα Καρρά'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		const summary = () => screen.getByTestId('doctor-new-summary');
		expect(
			[...summary().querySelectorAll('p[data-row]')].map((line) =>
				line.textContent?.replace(/\s+/gu, ' ').trim()
			)
		).toEqual([
			'Ασθενής Ιωάννα Καρρά',
			'Ιατρείο Λεωφ. Κηφισίας 120',
			'Υπηρεσία Επίσκεψη · 30 λεπτά',
			'Πότε Δευτέρα 16 Νοεμβρίου · 09:00',
			expect.stringMatching(/^Κόστος 60/u),
			'Ενημέρωση Εφαρμογή · email · SMS'
		]);
		expect(summary()).toHaveTextContent(
			'Το ραντεβού κλείνεται επιβεβαιωμένο. Το SMS χρεώνεται στα πακέτα σας (υπόλοιπο 118).'
		);
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
		serve({ smsOn: false });
		open();
		await ready();
		await user().click(row('Καλλιόπη Ζέρβα'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		expect(summary()).toHaveTextContent('Ενημέρωση Καμία');
		expect(summary()).toHaveTextContent(
			'Ο ασθενής δεν έχει email και το SMS είναι κλειστό: πείτε του την ώρα στο τηλέφωνο.'
		);
		expect(summary()).not.toHaveTextContent('χρεώνεται');
	});
});

describe('screen 72 · the write and what the server refuses (D-W51-70)', () => {
	it('a record and a relative travel as the contract takes them (`patientRecordId`; `RELATIVE` with its id)', async () => {
		serve();
		open();
		await ready();
		await user().click(row('Καλλιόπη Ζέρβα'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]?.body).toMatchObject({ patientRecordId: R3, status: 'booked' });
		expect(posts()[0]?.body).not.toHaveProperty('patientId');
		vi.unstubAllGlobals();
		document.body.innerHTML = '';
		serve();
		open();
		await ready();
		await user().click(row('Νίκος Μαυρίδης'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		await user().click(submit());
		await waitFor(() => expect(posts()).toHaveLength(1));
		expect(posts()[0]?.body).toMatchObject({
			patientId: HOLDER,
			bookedForType: 'RELATIVE',
			relativeId: REL
		});
	});

	it('409 (the hour taken meanwhile): «Αυτή η ώρα δεν είναι πλέον διαθέσιμη.», the hour leaves the grid, the hours read again', async () => {
		serve({
			write: { status: 409, message: 'appointment overlaps with an existing blocking appointment.' }
		});
		open();
		await ready();
		await user().click(row('Ιωάννα Καρρά'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		const before = reads('/appointment/doctor/slots').length;
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-failure')).toHaveTextContent(
				'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
			)
		);
		await waitFor(() => expect(reads('/appointment/doctor/slots').length).toBeGreaterThan(before));
		await waitFor(() => expect(screen.queryByTestId(`doctor-new-slot-${SLOT_1}`)).toBeNull());
		expect(submit()).toBeDisabled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('422: the fields the server names under them, «Ελέγξτε τα στοιχεία του ασθενή.»; the form stays', async () => {
		serve({
			write: { status: 422, message: 'Validation: Το πεδίο μπορεί να περιέχει μόνο γράμματα.' }
		});
		open();
		await ready();
		await user().click(row('Νέος ασθενής'));
		await fill('first-name', 'Μαρία');
		await fill('last-name', 'Οικονόμου');
		await fill('phone', '6985551212');
		await user().click(service('Επίσκεψη'));
		await pickHour();
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-failure')).toHaveTextContent(
				'Ελέγξτε τα στοιχεία του ασθενή.'
			)
		);
		expect(screen.getByTestId('doctor-new-first-name')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByTestId('doctor-new-last-name')).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByTestId('doctor-new-phone')).not.toHaveAttribute('aria-invalid');
		expect((screen.getByTestId('doctor-new-first-name') as HTMLInputElement).value).toBe('Μαρία');
	});

	it('404 (the record is no longer the doctor’s): back to the search with «δεν βρέθηκε»; a lost request keeps everything', async () => {
		serve({ write: { status: 404, message: 'Not found' } });
		open();
		await ready();
		await user().click(row('Καλλιόπη Ζέρβα'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-failure')).toHaveTextContent(
				'Αυτός ο ασθενής δεν βρέθηκε στους ασθενείς σας.'
			)
		);
		expect(screen.getByTestId('doctor-new-search')).toBeInTheDocument();
		server.write = { status: 0, error: true };
		await user().click(row('Ιωάννα Καρρά'));
		await user().click(submit());
		await waitFor(() =>
			expect(screen.getByTestId('doctor-new-failure')).toHaveTextContent(
				'Το ραντεβού δεν κλείστηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			)
		);
		expect(screen.getByTestId('doctor-new-picked')).toBeInTheDocument();
	});

	it('κανένα διπλό πάτημα: two presses while the first is on its way send ONE write', async () => {
		let release: () => void = () => {};
		serve({ write: { status: 201, wait: new Promise<void>((resolve) => (release = resolve)) } });
		open();
		await ready();
		await user().click(row('Ιωάννα Καρρά'));
		await user().click(service('Επίσκεψη'));
		await pickHour();
		await user().click(submit());
		await user().click(submit());
		release();
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(posts()).toHaveLength(1);
	});

	it('«Άκυρο» goes back one step when opened as one, else to where it belongs (no write)', async () => {
		serve();
		const go = vi.spyOn(history, 'go').mockImplementation(() => {});
		appPage.state = { doctorAppointment: { depth: 1 } } as App.PageState;
		open();
		await ready();
		await user().click(screen.getByTestId('doctor-new-cancel'));
		expect(go).toHaveBeenCalledWith(-1);
		expect(posts()).toHaveLength(0);
	});

	it('(negative, U-65.6) what a person typed shows back only as text', async () => {
		serve({
			recent: [{ ...ACCOUNT, firstName: '<img src=x onerror=alert(1)>', lastName: '<b>x</b>' }]
		});
		open();
		await ready();
		expect(document.querySelector('img')).toBeNull();
		expect(screen.getByTestId('doctor-new-patients').querySelector('b')).toBeNull();
		expect(rows()[0]).toHaveTextContent('<img src=x onerror=alert(1)> <b>x</b>');
	});
});
