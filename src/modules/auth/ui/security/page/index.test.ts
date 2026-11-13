import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import type { Session, SessionMember, SessionStatus } from '$shared/state/session';
import Harness from './security.harness.svelte';

/*
 * Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια» (record §5.4; D-W45-35 … 40, U-168): three parts — the password, edited
 * in its row, the linked providers, the devices. Every call is the auth module's own and is stubbed at the NETWORK,
 * with answers written from the contract (`schema.ts`) and the server's table (`reports/w45-b3.md`). Made-up people,
 * made-up passwords, made-up ids.
 */

const ELENI: SessionMember = {
	firstName: 'Ελένη',
	lastName: 'Παππά',
	maskedLoginEmail: 'e***a@example.gr',
	maskedLoginPhone: '+30 *** *** 4567',
	hasPatientProfile: true
};

const HERE = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a01';
const LAPTOP = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a02';
const OFFICE = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a03';

const OLD = 'Made-up old 1';
const NEW = 'Made-up new 2';

type Call = { method: string; path: string; search: string; body: unknown };
type Answer = () => Response | Promise<Response>;
type Route = 'methods' | 'sessions' | 'change' | 'init' | 'set' | 'unlink' | 'end';

let calls: Call[];
let server: Record<Route, Answer>;
let methodsData: Record<string, unknown>;
let sessionsData: Record<string, unknown>[];
let client: QueryClient;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status });
const refusal = (status: number, errorCode = 'EC000', errorMessage = 'refused by the server') =>
	new Response(JSON.stringify({ errorCode, errorMessage }), { status });

const provider = (name: 'GOOGLE' | 'APPLE', canUnlink = true) => ({
	provider: name,
	canUnlink,
	refusal: canUnlink ? null : 'NO_OTHER_SIGN_IN'
});
const device = (overrides: Record<string, unknown> = {}) => ({
	sessionId: LAPTOP,
	current: false,
	lastActiveAt: '2026-10-30T08:21:00.000Z',
	kind: 'WEB',
	os: 'MACOS',
	browser: 'CHROME',
	...overrides
});

function routeOf(method: string, path: string): Route | null {
	if (method === 'GET' && path === '/auth/sign-in-methods/me') return 'methods';
	if (method === 'GET' && path === '/auth/sessions/me') return 'sessions';
	if (method !== 'POST') return null;
	if (path === '/auth/password-credentials/me/change-password') return 'change';
	if (path === '/auth/password-credentials/me/set-password/init') return 'init';
	if (path === '/auth/password-credentials/me/set-password') return 'set';
	if (/^\/auth\/sign-in-methods\/me\/providers\/[^/]+\/unlink$/u.test(path)) return 'unlink';
	return /^\/auth\/sessions\/me\/[^/]+\/end$/u.test(path) ? 'end' : null;
}

const user = () => userEvent.setup({ delay: null });

beforeEach(() => {
	calls = [];
	methodsData = { passwordStatus: { set: true, canSet: true }, providers: [provider('GOOGLE')] };
	sessionsData = [
		device({
			sessionId: HERE,
			current: true,
			lastActiveAt: '2026-11-12T07:27:00.000Z',
			kind: 'APP',
			os: 'IOS',
			browser: null
		}),
		device(),
		device({
			sessionId: OFFICE,
			lastActiveAt: '2026-09-02T15:04:00.000Z',
			os: 'WINDOWS',
			browser: 'EDGE'
		})
	];
	server = {
		methods: () => json(methodsData),
		sessions: () => json({ sessions: sessionsData }),
		change: () => json({ tenantUserId: 'u-1', version: 2 }),
		init: () => json({ channel: 'email' }),
		set: () => json({ tenantUserId: 'u-1', version: 2 }),
		unlink: () => json({ provider: 'GOOGLE' }),
		end: () => json({ sessionId: LAPTOP })
	};
	client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			const address = new URL(url, 'https://api.test');
			const path = address.pathname.replace(/^\/api\/v\d+/u, '');
			calls.push({
				method,
				path,
				search: address.search,
				body: init.body ? JSON.parse(String(init.body)) : undefined
			});
			const route = routeOf(method, path);
			return route ? server[route]() : refusal(404, 'EC404', 'Resource not found');
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	window.localStorage.clear();
	window.sessionStorage.clear();
});

type Handle = { session: Session; status: () => SessionStatus };

async function draw(
	options: {
		member?: SessionMember;
		locale?: 'el' | 'en';
		offline?: boolean;
		start?: SessionStatus;
		wait?: boolean;
	} = {}
) {
	let handle: Handle | undefined;
	render(Harness, {
		props: {
			member: options.member ?? ELENI,
			client,
			locale: options.locale ?? 'el',
			offline: options.offline ?? false,
			start: options.start ?? 'member',
			onReady: (found: Handle) => (handle = found)
		}
	});
	if (options.wait !== false && (options.start ?? 'member') === 'member') {
		await screen.findByTestId('security-row-password');
		await screen.findByTestId('security-sessions');
	}
	return () => handle as Handle;
}

const passwordRow = () => screen.getByTestId('security-row-password');
const input = (testId: string) => screen.getByTestId(testId) as HTMLInputElement;
const writes = () => calls.filter((call) => call.method !== 'GET');
const reads = (route: 'methods' | 'sessions') =>
	calls.filter((call) => routeOf(call.method, call.path) === route).length;
const toast = () => document.querySelector('[data-slot="toast-message"]')?.textContent?.trim();
const toastTone = () => document.querySelector('[data-slot="toast"]')?.getAttribute('data-tone');

async function openPassword() {
	await user().click(screen.getByTestId('security-row-password-action'));
	expect(passwordRow()).toHaveAttribute('data-state', 'open');
}

async function fillChange(current: string, next: string) {
	if (current) await user().type(input('security-current-password-input'), current);
	if (next) await user().type(input('security-new-password-input'), next);
}

const save = () => user().click(screen.getByTestId('security-password-save'));

/** A request that stays out until the spec answers it. */
function held() {
	let answer: (response: Response) => void = () => undefined;
	const pending = new Promise<Response>((resolve) => (answer = resolve));
	return { answer: (response: Response) => answer(response), handler: () => pending };
}

/** What the page keeps anywhere but the open row: both caches, the two storages, the address, the cookies. */
function keptAnywhere(): string {
	const storage = (store: Storage) =>
		Array.from({ length: store.length }, (_, index) => {
			const key = store.key(index) ?? '';
			return [key, store.getItem(key)];
		});
	return JSON.stringify([
		client
			.getQueryCache()
			.getAll()
			.map((query) => [query.queryKey, query.state.data, query.state.error?.message]),
		client
			.getMutationCache()
			.getAll()
			.map((mutation) => [mutation.state.variables, mutation.state.data]),
		storage(window.localStorage),
		storage(window.sessionStorage),
		window.location.href,
		window.history.state,
		document.cookie,
		calls.map((call) => [call.path, call.search])
	]);
}

describe('auth/ui/security · the page (record §5.4)', () => {
	it('three parts in the record’s order — «Σύνδεση», «Σύνδεση με Google ή Apple», «Συσκευές» — each under its own heading, word for word, from two reads', async () => {
		await draw();
		const parts = screen
			.getByTestId('security-page')
			.querySelectorAll<HTMLElement>(':scope > section');
		expect(
			[...parts].map((part) => [part.dataset.testid, part.querySelector('h3')?.textContent?.trim()])
		).toEqual([
			['security-part-password', 'Σύνδεση'],
			['security-part-providers', 'Σύνδεση με Google ή Apple'],
			['security-part-devices', 'Συσκευές']
		]);
		for (const part of parts) {
			expect(part).toHaveAccessibleName(part.querySelector('h3')?.textContent?.trim());
		}
		expect(passwordRow().querySelector('h4')).toHaveTextContent('Κωδικός πρόσβασης');
		expect(passwordRow().querySelector('[data-slot="editable-row-value"]')).toHaveTextContent(
			'Έχει οριστεί'
		);
		expect(screen.getByTestId('security-row-password-action')).toHaveTextContent('Αλλαγή');
		expect(screen.getByTestId('security-part-devices')).toHaveTextContent(
			'Οι συσκευές από τις οποίες είστε συνδεδεμένοι. Αν δεν αναγνωρίζετε κάποια, αποσυνδέστε την και αλλάξτε τον κωδικό πρόσβασής σας.'
		);
		expect(calls).toEqual([
			{ method: 'GET', path: '/auth/sign-in-methods/me', search: '', body: undefined },
			{ method: 'GET', path: '/auth/sessions/me', search: '', body: undefined }
		]);
		// U-164.1: nothing of a doctor's on the user's page.
		expect(screen.getByTestId('security-page').textContent).not.toMatch(/γιατρ/iu);
	});

	it('each part waits on its own read, and a read with no answer says so IN its part with «Δοκιμάστε ξανά» — the other part stays as it is', async () => {
		const methods = held();
		server.methods = methods.handler;
		await draw({ wait: false });
		expect(screen.getByTestId('security-password-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByTestId('security-providers-loading')).toHaveAttribute('aria-busy', 'true');
		// The devices came back meanwhile: their part is drawn, the two others still wait.
		expect(await screen.findByTestId('security-session-0')).toBeInTheDocument();
		expect(screen.queryByTestId('security-row-password')).toBeNull();

		methods.answer(refusal(503));
		expect(await screen.findByTestId('security-password-failed')).toHaveTextContent(
			'Δεν ήταν δυνατή η φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(screen.getByTestId('security-providers-failed')).toBeInTheDocument();
		expect(screen.getByTestId('security-session-0')).toBeInTheDocument();
		expect(screen.queryByTestId('security-devices-failed')).toBeNull();

		server.methods = () => json(methodsData);
		await user().click(screen.getByTestId('security-providers-retry'));
		expect(await screen.findByTestId('security-row-password')).toBeInTheDocument();
		expect(screen.getByTestId('security-provider-google')).toBeInTheDocument();
		expect(reads('methods')).toBe(2);
		expect(reads('sessions')).toBe(1);
	});

	it('the devices’ read fails on its own: the password and the providers are there, the devices say so and ask again', async () => {
		server.sessions = () => refusal(500);
		await draw({ wait: false });
		expect(await screen.findByTestId('security-devices-failed')).toHaveTextContent(
			'Δεν ήταν δυνατή η φόρτωση.'
		);
		expect(await screen.findByTestId('security-row-password')).toBeInTheDocument();
		server.sessions = () => json({ sessions: sessionsData });
		await user().click(screen.getByTestId('security-devices-retry'));
		expect(await screen.findByTestId('security-session-0')).toBeInTheDocument();
	});

	it('an answer the page cannot read is a failed read — never «Δεν έχει οριστεί» or an empty list by default', async () => {
		server.methods = () => json({ providers: [] });
		server.sessions = () => json({ devices: [] });
		await draw({ wait: false });
		expect(await screen.findByTestId('security-password-failed')).toBeInTheDocument();
		expect(await screen.findByTestId('security-devices-failed')).toBeInTheDocument();
		expect(document.body.textContent).not.toContain('Δεν έχει οριστεί');
	});

	it('without a network and with nothing read yet, each part says so at once', async () => {
		const never = held();
		server.methods = never.handler;
		server.sessions = never.handler;
		await draw({ wait: false, offline: true });
		expect(screen.getByTestId('security-password-failed')).toBeInTheDocument();
		expect(screen.getByTestId('security-providers-failed')).toBeInTheDocument();
		expect(screen.getByTestId('security-devices-failed')).toBeInTheDocument();
	});

	it('🔴 U-65.6 (negative): a guest’s page asks the server nothing — no read, no write', async () => {
		await draw({ start: 'guest' });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(calls).toEqual([]);
		expect(screen.queryByTestId('security-row-password')).toBeNull();
	});

	it('in English the parts, the row and the devices say the page’s English', async () => {
		await draw({ locale: 'en' });
		expect(
			[...screen.getByTestId('security-page').querySelectorAll('h3')].map((heading) =>
				heading.textContent?.trim()
			)
		).toEqual(['Sign-in', 'Sign in with Google or Apple', 'Devices']);
		expect(passwordRow()).toHaveTextContent('Password');
		expect(passwordRow()).toHaveTextContent('Set');
		expect(screen.getByTestId('security-row-password-action')).toHaveTextContent('Change');
		expect(screen.getByTestId('security-provider-google')).toHaveTextContent('Connected');
		expect(screen.getByTestId('security-provider-google-unlink')).toHaveTextContent('Disconnect');
		expect(screen.getByTestId('security-session-0')).toHaveTextContent('iPhone · eDoctor app');
		expect(screen.getByTestId('security-session-current')).toHaveTextContent('THIS DEVICE');
		expect(screen.getByTestId('security-session-1-end')).toHaveTextContent('Sign out');
		expect(screen.getByTestId('security-part-devices')).toHaveTextContent(
			'The devices you are signed in from. If you don’t recognise one, sign it out and change your password.'
		);
	});
});

describe('auth/ui/security · «Κωδικός πρόσβασης», the change (D-W45-39)', () => {
	it('«Αλλαγή» opens the row IN its place: «Τρέχων κωδικός πρόσβασης», «Νέος κωδικός πρόσβασης» with «Τουλάχιστον 8 χαρακτήρες» under it, «Αποθήκευση», «Ξέχασα τον κωδικό μου», the line about the other devices — the focus in the first field, every other row faded', async () => {
		await draw();
		await openPassword();
		const current = input('security-current-password-input');
		const next = input('security-new-password-input');
		expect(current).toHaveFocus();
		expect(current).toHaveAttribute('type', 'password');
		expect(current).toHaveAttribute('autocomplete', 'current-password');
		expect(current).toHaveAttribute('maxlength', '128');
		expect(next).toHaveAttribute('type', 'password');
		expect(next).toHaveAttribute('autocomplete', 'new-password');
		expect(next).toHaveAttribute('maxlength', '128');
		expect(passwordRow()).toHaveTextContent('Τρέχων κωδικός πρόσβασης');
		expect(screen.getByLabelText('Τρέχων κωδικός πρόσβασης')).toBe(current);
		expect(screen.getByLabelText('Νέος κωδικός πρόσβασης')).toBe(next);
		// The record's «· τουλάχιστον 8 χαρακτήρες» is the field's own line of help, as the application writes it.
		expect(next).toHaveAccessibleDescription('Τουλάχιστον 8 χαρακτήρες');
		expect(screen.getByTestId('security-password-save')).toHaveTextContent('Αποθήκευση');
		expect(screen.getByTestId('security-forgot')).toHaveTextContent('Ξέχασα τον κωδικό μου');
		expect(passwordRow().querySelector('[data-slot="editable-row-help"]')).toHaveTextContent(
			'Μετά την αλλαγή αποσυνδέεστε από τις άλλες συσκευές σας.'
		);
		expect(screen.getByTestId('security-row-password-close')).toHaveTextContent('Ακύρωση');
		// Both fields open empty, and nothing was asked of the server.
		expect(current.value).toBe('');
		expect(next.value).toBe('');
		expect(writes()).toEqual([]);
		// The other rows fade and take no press while it is open.
		expect(screen.getByTestId('security-provider-google')).toHaveAttribute('data-dimmed', 'true');
		expect(screen.getByTestId('security-provider-google')).toHaveClass(
			'pointer-events-none',
			'opacity-35'
		);
		expect(screen.getByTestId('security-provider-google-unlink')).toHaveAttribute('tabindex', '-1');
		for (const index of [0, 1, 2]) {
			expect(screen.getByTestId(`security-session-${index}`)).toHaveAttribute(
				'data-dimmed',
				'true'
			);
		}
		expect(screen.getByTestId('security-session-1-end')).toHaveAttribute('tabindex', '-1');
		screen.getByTestId('security-provider-google-unlink').click();
		screen.getByTestId('security-session-1-end').click();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(screen.queryByTestId('security-unlink-dialog')).toBeNull();
		expect(writes()).toEqual([]);
	});

	it('the field’s own «Εμφάνιση» shows what was typed and «Απόκρυψη» hides it again, as the sign-in’s fields', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, '');
		const current = input('security-current-password-input');
		await user().click(within(passwordRow()).getAllByText('Εμφάνιση')[0]);
		expect(current).toHaveAttribute('type', 'text');
		await user().click(within(passwordRow()).getByText('Απόκρυψη'));
		expect(current).toHaveAttribute('type', 'password');
	});

	it('«Ακύρωση» and Escape drop whatever was typed: the row opens again EMPTY, the focus goes back to its link, nothing was sent', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		await user().click(screen.getByTestId('security-row-password-close'));
		expect(passwordRow()).toHaveAttribute('data-state', 'closed');
		expect(screen.getByTestId('security-row-password-action')).toHaveFocus();
		expect(document.body.innerHTML).not.toContain(OLD);
		expect(document.body.innerHTML).not.toContain(NEW);
		expect(screen.getByTestId('security-provider-google')).not.toHaveAttribute('data-dimmed');

		await openPassword();
		expect(input('security-current-password-input').value).toBe('');
		expect(input('security-new-password-input').value).toBe('');
		await fillChange(OLD, NEW);
		await user().keyboard('{Escape}');
		expect(passwordRow()).toHaveAttribute('data-state', 'closed');
		expect(screen.getByTestId('security-row-password-action')).toHaveFocus();
		await openPassword();
		expect(input('security-current-password-input').value).toBe('');
		expect(input('security-new-password-input').value).toBe('');
		expect(writes()).toEqual([]);
	});

	it('the page’s own checks before any request: «Γράψτε τον τρέχοντα κωδικό πρόσβασης.», «Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες» — the focus on the first field that is wrong', async () => {
		await draw();
		await openPassword();
		await save();
		expect(passwordRow()).toHaveTextContent('Γράψτε τον τρέχοντα κωδικό πρόσβασης.');
		expect(passwordRow()).toHaveTextContent('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
		expect(input('security-current-password-input')).toHaveAttribute('aria-invalid', 'true');
		expect(input('security-new-password-input')).toHaveAttribute('aria-invalid', 'true');
		expect(input('security-current-password-input')).toHaveFocus();

		// Typing in a field takes its own word away.
		await fillChange(OLD, '');
		expect(passwordRow()).not.toHaveTextContent('Γράψτε τον τρέχοντα κωδικό πρόσβασης.');
		await user().type(input('security-new-password-input'), 'Abc1');
		await save();
		expect(passwordRow()).toHaveTextContent('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
		expect(input('security-new-password-input')).toHaveFocus();

		// The sign-in's own rule of strength for a NEW password.
		await user().clear(input('security-new-password-input'));
		await user().type(input('security-new-password-input'), 'abcdefgh');
		await save();
		expect(passwordRow()).toHaveTextContent(
			'Χρησιμοποιήστε κεφαλαία, πεζά και έναν αριθμό ή σύμβολο'
		);

		// A current password no password can be is not the account's — said here, with no request.
		await user().clear(input('security-current-password-input'));
		await user().type(input('security-current-password-input'), 'short');
		await save();
		expect(passwordRow()).toHaveTextContent('Ο κωδικός πρόσβασης δεν είναι σωστός.');
		expect(writes()).toEqual([]);
	});

	it('«Αποθήκευση»: ONE `POST …/change-password` with the two passwords as typed, then the sign-in methods AND the devices are read again, the row closes with «Ο κωδικός πρόσβασης άλλαξε. Αποσυνδεθήκατε από τις άλλες συσκευές.»', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		// What the server does at the change: every other device is signed out.
		server.change = () => {
			sessionsData = sessionsData.slice(0, 1);
			return json({ tenantUserId: 'u-1', version: 2 });
		};
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(writes()).toEqual([
			{
				method: 'POST',
				path: '/auth/password-credentials/me/change-password',
				search: '',
				body: { currentPassword: OLD, newPassword: NEW }
			}
		]);
		expect(reads('methods')).toBe(2);
		expect(reads('sessions')).toBe(2);
		expect(toast()).toBe('Ο κωδικός πρόσβασης άλλαξε. Αποσυνδεθήκατε από τις άλλες συσκευές.');
		expect(screen.getByTestId('security-session-0')).toBeInTheDocument();
		expect(screen.queryByTestId('security-session-1')).toBeNull();
		expect(screen.getByTestId('security-row-password-action')).toHaveFocus();
		expect(screen.getByTestId('security-provider-google')).not.toHaveAttribute('data-dimmed');
	});

	it('ένα πάτημα = ένα αίτημα: while the change is out, a second «Αποθήκευση», Enter and «Ξέχασα τον κωδικό μου» send nothing more', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		const out = held();
		server.change = out.handler;
		await save();
		expect(screen.getByTestId('security-password-save')).toHaveAttribute('aria-busy', 'true');
		await save();
		await user().type(input('security-new-password-input'), '{Enter}');
		await user().click(screen.getByTestId('security-forgot'));
		expect(writes()).toHaveLength(1);
		expect(screen.queryByTestId('security-code-input')).toBeNull();
		out.answer(json({ tenantUserId: 'u-1', version: 2 }));
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(writes()).toHaveLength(1);
	});

	it('🔴 a wrong current password (`401 EC412`) is said under its field — «Ο κωδικός πρόσβασης δεν είναι σωστός.» — and is NO end of the session: the person stays signed in, the row stays open', async () => {
		const handle = await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		server.change = () =>
			refusal(401, 'EC412', 'The password or the email are incorrect! Please try again');
		await save();
		await waitFor(() =>
			expect(passwordRow()).toHaveTextContent('Ο κωδικός πρόσβασης δεν είναι σωστός.')
		);
		expect(handle().status()).toBe('member');
		expect(handle().session.expired).toBe(false);
		expect(handle().session.flowOpen).toBe(false);
		expect(passwordRow()).toHaveAttribute('data-state', 'open');
		expect(input('security-current-password-input')).toHaveAttribute('aria-invalid', 'true');
		expect(input('security-current-password-input')).toHaveFocus();
		// The server's own words are never drawn.
		expect(document.body.textContent).not.toContain('incorrect');
		// Nothing was read again, nothing else was sent; a second try is one more request.
		expect(reads('methods')).toBe(1);
		server.change = () => json({ tenantUserId: 'u-1', version: 2 });
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(writes()).toHaveLength(2);
	});

	it.each([
		[429, 'EC429', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		[500, 'EC500', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[403, 'EC403', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	])(
		'(negative) a change the server refuses with %s %s says «%s» over the fields; the row stays open with what was typed, the person stays signed in',
		async (status, code, words) => {
			const handle = await draw();
			await openPassword();
			await fillChange(OLD, NEW);
			server.change = () => refusal(status, code, '<b>refused by the server</b>');
			await save();
			expect(await screen.findByTestId('security-password-error')).toHaveTextContent(words);
			expect(screen.getByTestId('security-password-error')).toHaveAttribute('role', 'alert');
			expect(passwordRow()).toHaveAttribute('data-state', 'open');
			expect(input('security-current-password-input').value).toBe(OLD);
			expect(input('security-new-password-input').value).toBe(NEW);
			expect(handle().status()).toBe('member');
			expect(document.body.textContent).not.toContain('refused by the server');
			expect(document.body.querySelector('b')).toBeNull();
			expect(toast()).toBeUndefined();
		}
	);

	it('(negative) a new password the server will not take (`422`) is said under its field; no network says «Κάτι πήγε στραβά. Δοκιμάστε ξανά.»', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		server.change = () => refusal(422, 'EC423', 'newPassword is not valid');
		await save();
		await waitFor(() =>
			expect(input('security-new-password-input')).toHaveAttribute('aria-invalid', 'true')
		);
		expect(passwordRow()).toHaveTextContent('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
		expect(document.body.textContent).not.toContain('newPassword');

		server.change = () => Promise.reject(new TypeError('Failed to fetch'));
		await user().type(input('security-new-password-input'), '3');
		await save();
		expect(await screen.findByTestId('security-password-error')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		expect(document.body.textContent).not.toContain('Failed to fetch');
	});

	it('(negative) an account that has no password after all (`404`): what the row said is stale — its read is asked again and the row closes on what the server holds now, with no word of failure (the application’s rule)', async () => {
		const handle = await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		server.change = () => {
			methodsData = { passwordStatus: { set: false, canSet: true }, providers: [] };
			return refusal(404, 'EC404', 'Resource not found');
		};
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(reads('methods')).toBe(2);
		expect(reads('sessions')).toBe(1);
		expect(writes()).toHaveLength(1);
		expect(screen.getByTestId('security-row-password-action')).toHaveTextContent('Ορισμός');
		expect(screen.queryByTestId('security-password-error')).toBeNull();
		expect(toast()).toBeUndefined();
		expect(handle().status()).toBe('member');
		expect(document.body.innerHTML).not.toContain(OLD);
		expect(document.body.textContent).not.toContain('Κάτι πήγε στραβά');
		// No code was mailed by it: «Ορισμός» is the person's own press.
		expect(writes().map((call) => call.path)).toEqual([
			'/auth/password-credentials/me/change-password'
		]);
	});

	it('🔴 U-84: the session ended under the open row (`401 EC401`): the page knows nobody from that moment and the sign-in opens over it', async () => {
		const handle = await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		server.change = () => refusal(401, 'EC401', 'Unauthorized');
		await save();
		await waitFor(() => expect(handle().status()).toBe('guest'));
		expect(handle().session.expired).toBe(true);
		expect(handle().session.flowOpen).toBe(true);
		expect(toast()).toBeUndefined();
	});

	it('an account with a password but no address a code can go to (`set`, not `canSet`) changes it and has no «Ξέχασα τον κωδικό μου»', async () => {
		methodsData = { passwordStatus: { set: true, canSet: false }, providers: [] };
		await draw();
		await openPassword();
		expect(screen.getByTestId('security-current-password-input')).toBeInTheDocument();
		expect(screen.queryByTestId('security-forgot')).toBeNull();
	});
});

describe('auth/ui/security · «Κωδικός πρόσβασης», the mailed code («Ορισμός», «Ξέχασα τον κωδικό μου»)', () => {
	const NO_PASSWORD = { passwordStatus: { set: false, canSet: true }, providers: [] };

	it('an account with no password reads «Δεν έχει οριστεί · Ορισμός»; the press opens the row on the code and mails it with the SAME press — the sign-in’s own call, in the page’s language, with an empty body', async () => {
		methodsData = NO_PASSWORD;
		await draw();
		expect(passwordRow().querySelector('[data-slot="editable-row-value"]')).toHaveTextContent(
			'Δεν έχει οριστεί'
		);
		expect(screen.getByTestId('security-row-password-action')).toHaveTextContent('Ορισμός');
		await openPassword();
		const code = input('security-code-input');
		expect(code).toHaveFocus();
		expect(code).toHaveAttribute('autocomplete', 'one-time-code');
		expect(code).toHaveAttribute('inputmode', 'numeric');
		expect(input('security-new-password-input')).toHaveAttribute('autocomplete', 'new-password');
		expect(input('security-new-password-input')).toHaveAttribute('type', 'password');
		expect(screen.getByLabelText('Κωδικός επιβεβαίωσης')).toBe(code);
		expect(screen.getByLabelText('Νέος κωδικός πρόσβασης')).toBe(
			input('security-new-password-input')
		);
		expect(input('security-new-password-input')).toHaveAccessibleDescription(
			'Τουλάχιστον 8 χαρακτήρες'
		);
		expect(screen.getByTestId('security-password-save')).toHaveTextContent('Αποθήκευση κωδικού');
		expect(screen.getByTestId('security-code-resend')).toHaveTextContent('Αποστολή ξανά');
		expect(screen.queryByTestId('security-current-password-input')).toBeNull();
		expect(screen.queryByTestId('security-forgot')).toBeNull();
		// 🔴 U-168: the address exactly as the SERVER hides it.
		expect(passwordRow().querySelector('[data-slot="editable-row-help"]')).toHaveTextContent(
			'Καταχωρίστε τον κωδικό που στείλαμε στο email σας (e***a@example.gr) και επιλέξτε τον κωδικό πρόσβασης με τον οποίο θα συνδέεστε.'
		);
		await waitFor(() => expect(toast()).toBe('Στείλαμε έναν κωδικό στο email σας.'));
		expect(writes()).toEqual([
			{
				method: 'POST',
				path: '/auth/password-credentials/me/set-password/init',
				search: '?lang=el',
				body: {}
			}
		]);
	});

	it('the code and the new password: ONE `POST …/set-password` with both as typed; then both reads again and «Ο κωδικός πρόσβασης ορίστηκε.»', async () => {
		methodsData = NO_PASSWORD;
		await draw();
		await openPassword();
		await user().type(input('security-code-input'), '123456');
		await user().type(input('security-new-password-input'), NEW);
		server.set = () => {
			methodsData = { passwordStatus: { set: true, canSet: true }, providers: [] };
			return json({ tenantUserId: 'u-1', version: 1 });
		};
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(writes()).toEqual([
			expect.objectContaining({ path: '/auth/password-credentials/me/set-password/init' }),
			{
				method: 'POST',
				path: '/auth/password-credentials/me/set-password',
				search: '',
				body: { code: '123456', newPassword: NEW }
			}
		]);
		expect(reads('methods')).toBe(2);
		expect(reads('sessions')).toBe(2);
		expect(toast()).toBe('Ο κωδικός πρόσβασης ορίστηκε.');
		expect(passwordRow().querySelector('[data-slot="editable-row-value"]')).toHaveTextContent(
			'Έχει οριστεί'
		);
		expect(screen.getByTestId('security-row-password-action')).toHaveTextContent('Αλλαγή');
	});

	it('«Ξέχασα τον κωδικό μου» goes on IN the same row: the code is mailed, the change’s fields and whatever was typed in them are gone, the focus is in the code’s field — and after it the word is «…άλλαξε…»', async () => {
		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		await user().click(screen.getByTestId('security-forgot'));
		expect(await screen.findByTestId('security-code-input')).toHaveFocus();
		expect(screen.queryByTestId('security-current-password-input')).toBeNull();
		expect(input('security-new-password-input').value).toBe('');
		expect(document.body.innerHTML).not.toContain(OLD);
		expect(passwordRow()).toHaveAttribute('data-state', 'open');
		expect(passwordRow().querySelector('[data-slot="editable-row-help"]')).toHaveTextContent(
			'(e***a@example.gr)'
		);
		await waitFor(() => expect(toast()).toBe('Στείλαμε έναν κωδικό στο email σας.'));
		expect(writes().map((call) => call.path)).toEqual([
			'/auth/password-credentials/me/set-password/init'
		]);

		await user().type(input('security-code-input'), '654321');
		await user().type(input('security-new-password-input'), NEW);
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		expect(toast()).toBe('Ο κωδικός πρόσβασης άλλαξε. Αποσυνδεθήκατε από τις άλλες συσκευές.');
		expect(writes()[1].body).toEqual({ code: '654321', newPassword: NEW });
		// Open again, the row is the change once more — the code's step is not remembered.
		await openPassword();
		expect(screen.getByTestId('security-current-password-input')).toBeInTheDocument();
	});

	it('🔴 U-168: an account whose address the server did not tell reads the line with no address — the page hides nothing itself and invents none', async () => {
		methodsData = NO_PASSWORD;
		await draw({ member: { ...ELENI, maskedLoginEmail: null } });
		await openPassword();
		expect(passwordRow().querySelector('[data-slot="editable-row-help"]')).toHaveTextContent(
			'Καταχωρίστε τον κωδικό που στείλαμε στο email σας και επιλέξτε τον κωδικό πρόσβασης με τον οποίο θα συνδέεστε.'
		);
		expect(passwordRow().textContent).not.toMatch(/[()@]/u);
	});

	it('🔴 U-65.6: the code’s field keeps digits alone, six at most — a letter, a space or markup typed or pasted leaves nothing behind', async () => {
		methodsData = NO_PASSWORD;
		await draw();
		await openPassword();
		const code = input('security-code-input');
		await user().type(code, '12a 3<b>4');
		expect(code.value).toBe('1234');
		await user().clear(code);
		await user().click(code);
		await user().paste('99-88 77 66 55');
		expect(code.value).toBe('998877');
	});

	it('the page’s own checks before any request: «Ο κωδικός έχει 6 ψηφία.», «Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες»', async () => {
		methodsData = NO_PASSWORD;
		await draw();
		await openPassword();
		await waitFor(() => expect(writes()).toHaveLength(1));
		await user().type(input('security-code-input'), '12345');
		await save();
		expect(passwordRow()).toHaveTextContent('Ο κωδικός έχει 6 ψηφία.');
		expect(passwordRow()).toHaveTextContent('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
		expect(input('security-code-input')).toHaveFocus();
		expect(writes()).toHaveLength(1);
	});

	it('🔴 a wrong code (`401 EC011`) is said under its field — «Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.» — and is NO end of the session; the field empties for the next try', async () => {
		methodsData = NO_PASSWORD;
		const handle = await draw();
		await openPassword();
		await user().type(input('security-code-input'), '000000');
		await user().type(input('security-new-password-input'), NEW);
		server.set = () => refusal(401, 'EC011', 'Invalid verify code');
		await save();
		await waitFor(() =>
			expect(passwordRow()).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		expect(handle().status()).toBe('member');
		expect(handle().session.expired).toBe(false);
		expect(input('security-code-input').value).toBe('');
		expect(input('security-code-input')).toHaveFocus();
		expect(input('security-new-password-input').value).toBe(NEW);
		expect(passwordRow()).toHaveAttribute('data-state', 'open');
		expect(document.body.textContent).not.toContain('Invalid verify code');
	});

	it.each([
		[401, 'EC007', 'Ο κωδικός έληξε. Ζητήστε καινούριο.', 'field'],
		[401, 'EC009', 'Ο κωδικός έληξε. Ζητήστε καινούριο.', 'field'],
		[401, 'EC008', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.', 'notice'],
		[403, 'USER_LOCKED', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.', 'notice'],
		[429, 'EC429', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.', 'notice'],
		[
			401,
			'SIGN_IN_NOT_AVAILABLE',
			'Δεν μπορούμε να ορίσουμε κωδικό πρόσβασης για αυτόν τον λογαριασμό.',
			'notice'
		],
		[500, 'EC500', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.', 'notice']
	])(
		'(negative) the set refused with %s %s says «%s» — and none of them ends the session',
		async (status, errorCode, words, where) => {
			methodsData = NO_PASSWORD;
			const handle = await draw();
			await openPassword();
			await user().type(input('security-code-input'), '123456');
			await user().type(input('security-new-password-input'), NEW);
			server.set = () => refusal(status, errorCode, 'the server’s own words');
			await save();
			await waitFor(() => expect(passwordRow()).toHaveTextContent(words));
			if (where === 'notice') {
				expect(screen.getByTestId('security-password-error')).toHaveTextContent(words);
			} else {
				expect(input('security-code-input')).toHaveAttribute('aria-invalid', 'true');
				expect(input('security-code-input').value).toBe('');
			}
			expect(handle().status()).toBe('member');
			expect(passwordRow()).toHaveAttribute('data-state', 'open');
			expect(document.body.textContent).not.toContain('the server’s own words');
		}
	);

	it('🔴 U-84: `401 EC401` on the send or on the set is the session’s end — the sign-in opens over the page', async () => {
		methodsData = NO_PASSWORD;
		server.init = () => refusal(401, 'EC401', 'Unauthorized');
		const handle = await draw();
		await user().click(screen.getByTestId('security-row-password-action'));
		await waitFor(() => expect(handle().status()).toBe('guest'));
		expect(handle().session.flowOpen).toBe(true);
	});

	it('«Αποστολή ξανά»: inside the minute it says how long to wait and sends nothing; after it ONE new send and «Στείλαμε νέο κωδικό.»; a server that says «too soon» is said the same way', async () => {
		methodsData = NO_PASSWORD;
		const clock = vi.spyOn(Date, 'now');
		const sentAt = 1_800_000_000_000;
		clock.mockReturnValue(sentAt);
		await draw();
		await openPassword();
		await waitFor(() => expect(toast()).toBe('Στείλαμε έναν κωδικό στο email σας.'));

		clock.mockReturnValue(sentAt + 18_400);
		await user().click(screen.getByTestId('security-code-resend'));
		expect(screen.getByTestId('security-code-resend-wait')).toHaveTextContent(
			'Περιμένετε 42 δευτερόλεπτα για νέο κωδικό.'
		);
		expect(screen.getByTestId('security-code-resend-wait')).toHaveAttribute('role', 'alert');
		expect(writes()).toHaveLength(1);

		clock.mockReturnValue(sentAt + 60_000);
		await user().click(screen.getByTestId('security-code-resend'));
		await waitFor(() => expect(toast()).toBe('Στείλαμε νέο κωδικό.'));
		expect(screen.queryByTestId('security-code-resend-wait')).toBeNull();
		expect(writes().map((call) => [call.path, call.search, call.body])).toEqual([
			['/auth/password-credentials/me/set-password/init', '?lang=el', {}],
			['/auth/password-credentials/me/set-password/init', '?lang=el', {}]
		]);

		clock.mockReturnValue(sentAt + 130_000);
		server.init = () => refusal(429, 'EC429', 'Too many requests. Please try again later.');
		await user().click(screen.getByTestId('security-code-resend'));
		expect(await screen.findByTestId('security-code-resend-wait')).toHaveTextContent(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(writes()).toHaveLength(3);
	});

	it('a code that could not be mailed says so over the fields, which stay; «Αποστολή ξανά» asks again at once — and a press while a send is out sends nothing more', async () => {
		methodsData = NO_PASSWORD;
		server.init = () => refusal(503, 'EC503', 'down');
		await draw();
		await openPassword();
		expect(await screen.findByTestId('security-password-error')).toHaveTextContent(
			'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		);
		expect(screen.getByTestId('security-code-input')).toBeInTheDocument();
		expect(toast()).toBeUndefined();

		const out = held();
		server.init = out.handler;
		await user().click(screen.getByTestId('security-code-resend'));
		await user().click(screen.getByTestId('security-code-resend'));
		expect(writes()).toHaveLength(2);
		expect(screen.queryByTestId('security-password-error')).toBeNull();
		out.answer(json({ channel: 'email' }));
		await waitFor(() => expect(toast()).toBe('Στείλαμε νέο κωδικό.'));
	});

	it('ένα πάτημα = ένα αίτημα: the row opened again inside the minute mails no second code (the one that is out still holds); nor does a second «Αποθήκευση κωδικού» while the first is out', async () => {
		methodsData = NO_PASSWORD;
		await draw();
		await openPassword();
		await waitFor(() => expect(writes()).toHaveLength(1));
		await user().click(screen.getByTestId('security-row-password-close'));
		await openPassword();
		expect(screen.getByTestId('security-code-input')).toBeInTheDocument();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(writes()).toHaveLength(1);

		await user().type(input('security-code-input'), '123456');
		await user().type(input('security-new-password-input'), NEW);
		const out = held();
		server.set = out.handler;
		await save();
		await save();
		await user().click(screen.getByTestId('security-code-resend'));
		expect(writes()).toHaveLength(2);
		out.answer(json({ tenantUserId: 'u-1', version: 1 }));
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
	});

	it('🔴 D-W45-39: an account with no sign-in email reads «Δεν έχει οριστεί» with NO «Ορισμός» — and the line «Προσθέστε email στα «Προσωπικά στοιχεία» για να ορίσετε κωδικό πρόσβασης.»; nothing opens, nothing is sent', async () => {
		methodsData = {
			passwordStatus: { set: false, canSet: false },
			providers: [provider('APPLE', false)]
		};
		await draw();
		expect(passwordRow()).toHaveTextContent('Κωδικός πρόσβασης');
		expect(passwordRow()).toHaveTextContent('Δεν έχει οριστεί');
		expect(screen.getByTestId('security-password-hint')).toHaveTextContent(
			'Προσθέστε email στα «Προσωπικά στοιχεία» για να ορίσετε κωδικό πρόσβασης.'
		);
		expect(screen.queryByTestId('security-row-password-action')).toBeNull();
		expect(within(passwordRow()).queryByRole('button')).toBeNull();
		expect(passwordRow().textContent).not.toMatch(/Ορισμός|Αλλαγή/u);
		expect(writes()).toEqual([]);
	});
});

describe('auth/ui/security · 🔴 U-168: κανένας κωδικός πρόσβασης σε cache, αποθήκη ή διεύθυνση', () => {
	it('U-168: κανένας κωδικός πρόσβασης σε cache, αποθήκη ή διεύθυνση — typed, refused, kept or dropped, the two passwords and the code are in the open row’s fields and in the ONE request’s body, nowhere else', async () => {
		const CODE = '482913';
		const before = window.location.href;
		const logged: unknown[][] = [];
		for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
			vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logged.push(args));
		}
		const secrets = [OLD, NEW, CODE, encodeURIComponent(OLD), encodeURIComponent(NEW)];
		const nowhere = () => {
			const kept = keptAnywhere();
			for (const secret of secrets) expect(kept, secret).not.toContain(secret);
			expect(JSON.stringify(logged)).not.toContain(OLD);
			expect(JSON.stringify(logged)).not.toContain(NEW);
			expect(window.location.href).toBe(before);
		};

		await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		// Typed: in the two fields' own value, never in an attribute of the page.
		expect(document.body.innerHTML).not.toContain(OLD);
		expect(document.body.innerHTML).not.toContain(NEW);
		nowhere();

		// Refused: the answer changes nothing of where they live.
		server.change = () => refusal(401, 'EC412', `echo ${OLD} ${NEW}`);
		await save();
		await waitFor(() =>
			expect(passwordRow()).toHaveTextContent('Ο κωδικός πρόσβασης δεν είναι σωστός.')
		);
		expect(document.body.textContent).not.toContain(OLD);
		nowhere();

		// The mailed code and its new password, refused too.
		await user().click(screen.getByTestId('security-forgot'));
		await user().type(await screen.findByTestId('security-code-input'), CODE);
		await user().type(input('security-new-password-input'), NEW);
		server.set = () => refusal(401, 'EC011', `echo ${CODE} ${NEW}`);
		await save();
		await waitFor(() =>
			expect(passwordRow()).toHaveTextContent('Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.')
		);
		nowhere();

		// Kept: after the change the row is closed and nothing of them is left on the page.
		await user().type(input('security-code-input'), CODE);
		server.set = () => json({ tenantUserId: 'u-1', version: 3 });
		await save();
		await waitFor(() => expect(passwordRow()).toHaveAttribute('data-state', 'closed'));
		nowhere();
		expect(document.body.innerHTML).not.toContain(NEW);
		expect(document.body.innerHTML).not.toContain(CODE);
		for (const field of document.querySelectorAll('input')) {
			expect(field.value).not.toBe(NEW);
		}

		// The only places they ever were: the bodies of the page's own writes.
		expect(writes().map((call) => [call.path, call.body])).toEqual([
			['/auth/password-credentials/me/change-password', { currentPassword: OLD, newPassword: NEW }],
			['/auth/password-credentials/me/set-password/init', {}],
			['/auth/password-credentials/me/set-password', { code: CODE, newPassword: NEW }],
			['/auth/password-credentials/me/set-password', { code: CODE, newPassword: NEW }]
		]);
		// And the page's caches hold the two reads alone — two booleans and the devices' words.
		expect(
			client
				.getQueryCache()
				.getAll()
				.map((query) => query.queryKey)
		).toEqual([
			['auth', 'sign-in-methods'],
			['auth', 'account-sessions']
		]);
		expect(client.getMutationCache().getAll()).toEqual([]);
	});

	it('U-168 (negative): a session that ends under the open row takes what was typed with it — the page of the next person has none of it', async () => {
		const handle = await draw();
		await openPassword();
		await fillChange(OLD, NEW);
		server.change = () => refusal(401, 'EC401', 'Unauthorized');
		await save();
		await waitFor(() => expect(handle().status()).toBe('guest'));
		expect(document.body.innerHTML).not.toContain(OLD);
		expect(document.body.innerHTML).not.toContain(NEW);
		expect(document.querySelector('input')).toBeNull();
		expect(keptAnywhere()).not.toContain(OLD);
		expect(keptAnywhere()).not.toContain(NEW);
	});
});

describe('auth/ui/security · «Σύνδεση με Google ή Apple» (D-W45-38)', () => {
	const dialog = () => screen.findByTestId('security-unlink-dialog');

	it('only what is linked shows — «Google · Συνδεδεμένο · Αποσύνδεση» — and there is no «Σύνδεση» from here', async () => {
		methodsData = {
			passwordStatus: { set: true, canSet: true },
			providers: [provider('APPLE'), provider('GOOGLE')]
		};
		await draw();
		const part = screen.getByTestId('security-part-providers');
		expect(
			[...part.querySelectorAll<HTMLElement>('[data-testid^="security-provider-"]')]
				.filter((element) =>
					/^security-provider-(google|apple)$/u.test(element.dataset.testid ?? '')
				)
				.map((element) => [
					element.dataset.testid,
					element.querySelector('h4')?.textContent?.trim(),
					element.querySelector('p')?.textContent?.trim()
				])
		).toEqual([
			['security-provider-google', 'Google', 'Συνδεδεμένο'],
			['security-provider-apple', 'Apple', 'Συνδεδεμένο']
		]);
		expect(screen.getByTestId('security-provider-google-unlink')).toHaveTextContent('Αποσύνδεση');
		expect(screen.getByTestId('security-provider-apple-unlink')).toHaveTextContent('Αποσύνδεση');
		expect(
			within(part)
				.getAllByRole('button')
				.map((button) => button.textContent?.trim())
		).toEqual(['Αποσύνδεση', 'Αποσύνδεση']);
		expect(screen.queryByTestId('security-providers-empty')).toBeNull();
	});

	it('with none linked: «Κανένας συνδεδεμένος λογαριασμός» · «Όταν συνδεθείτε με Google ή Apple, θα φαίνεται εδώ.» — words only', async () => {
		methodsData = { passwordStatus: { set: true, canSet: true }, providers: [] };
		await draw();
		const empty = screen.getByTestId('security-providers-empty');
		expect(empty).toHaveTextContent('Κανένας συνδεδεμένος λογαριασμός');
		expect(empty).toHaveTextContent('Όταν συνδεθείτε με Google ή Apple, θα φαίνεται εδώ.');
		expect(within(screen.getByTestId('security-part-providers')).queryByRole('button')).toBeNull();
		expect(screen.queryByTestId('security-provider-google')).toBeNull();
	});

	it('«Αποσύνδεση» asks in a window — «Αποσύνδεση του Google;», its line, «Άκυρο» / «Αποσύνδεση»; «Άκυρο» sends nothing and the row stays', async () => {
		await draw();
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		const window = await dialog();
		expect(window).toHaveAccessibleName('Αποσύνδεση του Google;');
		expect(window).toHaveTextContent(
			'Δεν θα μπορείτε πια να συνδέεστε στο eDoctor με το Google. Θα συνδέεστε με το email σας.'
		);
		expect(screen.getByTestId('security-unlink-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('security-unlink-confirm')).toHaveTextContent('Αποσύνδεση');
		await user().click(screen.getByTestId('security-unlink-cancel'));
		await waitFor(() => expect(screen.queryByTestId('security-unlink-dialog')).toBeNull());
		expect(screen.getByTestId('security-provider-google')).toBeInTheDocument();
		expect(writes()).toEqual([]);
	});

	it.each([
		['GOOGLE', 'google', 'Το Google αποσυνδέθηκε.'],
		['APPLE', 'apple', 'Το Apple αποσυνδέθηκε.']
	] as const)(
		'«Αποσύνδεση» of %s (row `%s`): ONE `POST …/providers/<PROVIDER>/unlink` with an empty body, the sign-in methods read again, the row gone, «%s»',
		async (name, slug, words) => {
			methodsData = { passwordStatus: { set: true, canSet: true }, providers: [provider(name)] };
			await draw();
			await user().click(screen.getByTestId(`security-provider-${slug}-unlink`));
			expect(await dialog()).toHaveTextContent(slug === 'apple' ? 'με το Apple' : 'με το Google');
			server.unlink = () => {
				methodsData = { passwordStatus: { set: true, canSet: true }, providers: [] };
				return json({ provider: name });
			};
			await user().click(screen.getByTestId('security-unlink-confirm'));
			await waitFor(() => expect(toast()).toBe(words));
			expect(writes()).toEqual([
				{
					method: 'POST',
					path: `/auth/sign-in-methods/me/providers/${name}/unlink`,
					search: '',
					body: {}
				}
			]);
			expect(reads('methods')).toBe(2);
			// The devices are untouched by it: no session is ended.
			expect(reads('sessions')).toBe(1);
			await waitFor(() => expect(screen.queryByTestId('security-unlink-dialog')).toBeNull());
			expect(screen.queryByTestId(`security-provider-${slug}`)).toBeNull();
			expect(screen.getByTestId('security-providers-empty')).toBeInTheDocument();
		}
	);

	it('ένα πάτημα = ένα αίτημα: a second «Αποσύνδεση» in the window, and «Άκυρο», while the first is out send nothing and close nothing', async () => {
		await draw();
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		await dialog();
		const out = held();
		server.unlink = out.handler;
		await user().click(screen.getByTestId('security-unlink-confirm'));
		screen.getByTestId('security-unlink-confirm').click();
		await user().click(screen.getByTestId('security-unlink-cancel'));
		expect(writes()).toHaveLength(1);
		expect(screen.getByTestId('security-unlink-dialog')).toBeInTheDocument();
		methodsData = { passwordStatus: { set: true, canSet: true }, providers: [] };
		out.answer(json({ provider: 'GOOGLE' }));
		await waitFor(() => expect(toast()).toBe('Το Google αποσυνδέθηκε.'));
		expect(writes()).toHaveLength(1);
	});

	it.each([
		['APPLE', 'apple', 'Apple'],
		['GOOGLE', 'google', 'Google']
	] as const)(
		'D-W45-38: `canUnlink: false` ⇒ το κείμενο, κανένα παράθυρο, κανένα αίτημα — «Αποσύνδεση» of %s says «Για να αποσυνδέσετε το … προσθέστε πρώτα ένα κινητό…» under the row',
		async (name, slug, word) => {
			methodsData = {
				passwordStatus: { set: false, canSet: false },
				providers: [provider(name, false)]
			};
			await draw();
			// Until it is pressed the row says nothing of it.
			expect(screen.queryByTestId(`security-provider-${slug}-refusal`)).toBeNull();
			await user().click(screen.getByTestId(`security-provider-${slug}-unlink`));
			const words = screen.getByTestId(`security-provider-${slug}-refusal`);
			expect(words).toHaveTextContent(
				`Για να αποσυνδέσετε το ${word}, προσθέστε πρώτα ένα κινητό στα «Προσωπικά στοιχεία», ώστε να έχετε τρόπο να συνδέεστε.`
			);
			expect(words).toHaveAttribute('role', 'alert');
			expect(screen.getByTestId(`security-provider-${slug}`)).toContainElement(words);
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(screen.queryByTestId('security-unlink-dialog')).toBeNull();
			expect(screen.queryByRole('dialog')).toBeNull();
			expect(writes()).toEqual([]);
			// A second press is the same: still no window, still no request.
			await user().click(screen.getByTestId(`security-provider-${slug}-unlink`));
			expect(screen.queryByRole('dialog')).toBeNull();
			expect(writes()).toEqual([]);
			expect(screen.getByTestId(`security-provider-${slug}`)).toBeInTheDocument();
		}
	);

	it('D-W45-38: the server refuses AT the press (`403 …NO_OTHER_SIGN_IN`) ⇒ the window closes, the SAME words show under the row, the read is asked again — and the next press opens no window', async () => {
		const handle = await draw();
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		await dialog();
		server.unlink = () => {
			methodsData = {
				passwordStatus: { set: true, canSet: false },
				providers: [provider('GOOGLE', false)]
			};
			return refusal(403, 'EC403', 'Forbidden: SIGN_IN_PROVIDER_UNLINK_REFUSED:NO_OTHER_SIGN_IN');
		};
		await user().click(screen.getByTestId('security-unlink-confirm'));
		expect(await screen.findByTestId('security-provider-google-refusal')).toHaveTextContent(
			'Για να αποσυνδέσετε το Google, προσθέστε πρώτα ένα κινητό στα «Προσωπικά στοιχεία», ώστε να έχετε τρόπο να συνδέεστε.'
		);
		await waitFor(() => expect(screen.queryByTestId('security-unlink-dialog')).toBeNull());
		await waitFor(() => expect(reads('methods')).toBe(2));
		expect(handle().status()).toBe('member');
		expect(toast()).toBeUndefined();
		expect(document.body.textContent).not.toContain('SIGN_IN_PROVIDER_UNLINK_REFUSED');
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(writes()).toHaveLength(1);
	});

	it('a provider that is linked no more (`404`: another device was faster) ⇒ the window closes and the read is asked again, with no word of failure', async () => {
		await draw();
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		await dialog();
		server.unlink = () => {
			methodsData = { passwordStatus: { set: true, canSet: true }, providers: [] };
			return refusal(404, 'EC404', 'Resource not found');
		};
		await user().click(screen.getByTestId('security-unlink-confirm'));
		expect(await screen.findByTestId('security-providers-empty')).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByTestId('security-unlink-dialog')).toBeNull());
		expect(reads('methods')).toBe(2);
		expect(toast()).toBeUndefined();
		expect(document.body.textContent).not.toContain('Κάτι πήγε στραβά');
	});

	it.each([
		[429, 'EC429', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		[500, 'EC500', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[403, 'EC403', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[401, 'EC412', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	])(
		'(negative) an unlink refused with %s %s says «%s» IN the window, which stays; the provider stays linked and the person signed in',
		async (status, code, words) => {
			const handle = await draw();
			await user().click(screen.getByTestId('security-provider-google-unlink'));
			await dialog();
			server.unlink = () => refusal(status, code, 'Forbidden');
			await user().click(screen.getByTestId('security-unlink-confirm'));
			expect(await screen.findByTestId('security-unlink-failure')).toHaveTextContent(words);
			expect(screen.getByTestId('security-unlink-dialog')).toBeInTheDocument();
			expect(screen.getByTestId('security-provider-google')).toBeInTheDocument();
			expect(screen.queryByTestId('security-provider-google-refusal')).toBeNull();
			expect(handle().status()).toBe('member');
			expect(toast()).toBeUndefined();
		}
	);

	it('🔴 U-84: `401 EC401` at the unlink is the session’s end — the sign-in opens, nothing says the provider went', async () => {
		const handle = await draw();
		await user().click(screen.getByTestId('security-provider-google-unlink'));
		await dialog();
		server.unlink = () => refusal(401, 'EC401', 'Unauthorized');
		await user().click(screen.getByTestId('security-unlink-confirm'));
		await waitFor(() => expect(handle().status()).toBe('guest'));
		expect(handle().session.flowOpen).toBe(true);
		expect(toast()).toBeUndefined();
	});
});

describe('auth/ui/security · «Συσκευές» (D-W45-35, D-W45-40)', () => {
	it('every device: its glyph, «συσκευή · browser ή εφαρμογή», when it was last active — THIS device first, with «ΑΥΤΗ Η ΣΥΣΚΕΥΗ»; no city, no address, no id on the page', async () => {
		await draw();
		const rows = [...screen.getByTestId('security-sessions').querySelectorAll('li')];
		expect(
			rows.map((row) => [
				row.dataset.testid,
				row.querySelector('h4')?.textContent?.trim(),
				row.querySelector('[data-icon]')?.getAttribute('data-icon'),
				row.querySelector('p')?.textContent?.trim()
			])
		).toEqual([
			[
				'security-session-0',
				'iPhone · εφαρμογή eDoctor',
				'phone-portrait-outline',
				'12 Νοεμβρίου 2026 στις 09:27'
			],
			['security-session-1', 'macOS · Chrome', 'laptop-outline', '30 Οκτωβρίου 2026 στις 10:21'],
			['security-session-2', 'Windows · Edge', 'laptop-outline', '2 Σεπτεμβρίου 2026 στις 18:04']
		]);
		expect(rows[0]).toContainElement(screen.getByTestId('security-session-current'));
		expect(screen.getByTestId('security-session-current')).toHaveTextContent('ΑΥΤΗ Η ΣΥΣΚΕΥΗ');
		expect(screen.getAllByTestId('security-session-current')).toHaveLength(1);
		// 🔴 U-65.6: a session's id is in no attribute, no text and no address of the page.
		for (const id of [HERE, LAPTOP, OFFICE]) {
			expect(document.body.innerHTML).not.toContain(id);
			expect(window.location.href).not.toContain(id);
		}
	});

	it('D-W45-40: η τρέχουσα συσκευή δεν έχει Αποσύνδεση — every OTHER device has one, this one none, wherever the answer puts it', async () => {
		sessionsData = [
			device(),
			device({ sessionId: HERE, current: true }),
			device({ sessionId: OFFICE })
		];
		await draw();
		const current = screen.getByTestId('security-session-0');
		expect(current).toHaveAttribute('data-current', 'true');
		expect(current).toContainElement(screen.getByTestId('security-session-current'));
		expect(screen.queryByTestId('security-session-0-end')).toBeNull();
		expect(within(current).queryByRole('button')).toBeNull();
		expect(current.textContent).not.toContain('Αποσύνδεση');
		for (const index of [1, 2]) {
			const end = screen.getByTestId(`security-session-${index}-end`);
			expect(end).toHaveTextContent('Αποσύνδεση');
			expect(end).toHaveAccessibleDescription('macOS · Chrome');
			expect(screen.getByTestId(`security-session-${index}`)).not.toHaveAttribute('data-current');
		}
		// With this device alone, nothing on the list can be pressed.
		sessionsData = [device({ sessionId: HERE, current: true })];
		await client.invalidateQueries({ queryKey: ['auth', 'account-sessions'] });
		await waitFor(() => expect(screen.queryByTestId('security-session-1')).toBeNull());
		expect(within(screen.getByTestId('security-part-devices')).queryByRole('button')).toBeNull();
		expect(writes()).toEqual([]);
	});

	it('«Αποσύνδεση» of another device: ONE `POST /auth/sessions/me/<id>/end` — the id in the request’s path alone, an empty body — the list read again, «Η συσκευή αποσυνδέθηκε.»', async () => {
		const before = window.location.href;
		await draw();
		server.end = () => {
			sessionsData = sessionsData.filter((entry) => entry.sessionId !== LAPTOP);
			return json({ sessionId: LAPTOP });
		};
		await user().click(screen.getByTestId('security-session-1-end'));
		await waitFor(() => expect(toast()).toBe('Η συσκευή αποσυνδέθηκε.'));
		expect(writes()).toEqual([
			{ method: 'POST', path: `/auth/sessions/me/${LAPTOP}/end`, search: '', body: {} }
		]);
		expect(reads('sessions')).toBe(2);
		expect(reads('methods')).toBe(1);
		expect(screen.getByTestId('security-session-1')).toHaveTextContent('Windows · Edge');
		expect(screen.queryByTestId('security-session-2')).toBeNull();
		expect(window.location.href).toBe(before);
		expect(toastTone()).not.toBe('danger');
	});

	it('ένα πάτημα = ένα αίτημα: a second press on the same device, and a press on another, while the first is out send nothing', async () => {
		await draw();
		const out = held();
		server.end = out.handler;
		await user().click(screen.getByTestId('security-session-1-end'));
		expect(screen.getByTestId('security-session-1')).toHaveAttribute('data-pending', 'true');
		await user().click(screen.getByTestId('security-session-1-end'));
		await user().click(screen.getByTestId('security-session-2-end'));
		expect(writes()).toHaveLength(1);
		expect(writes()[0].path).toBe(`/auth/sessions/me/${LAPTOP}/end`);
		sessionsData = sessionsData.filter((entry) => entry.sessionId !== LAPTOP);
		out.answer(json({ sessionId: LAPTOP }));
		await waitFor(() => expect(toast()).toBe('Η συσκευή αποσυνδέθηκε.'));
		// Once it answered, the next device takes its own press.
		server.end = () => json({ sessionId: OFFICE });
		await user().click(screen.getByTestId('security-session-1-end'));
		await waitFor(() => expect(writes()).toHaveLength(2));
		expect(writes()[1].path).toBe(`/auth/sessions/me/${OFFICE}/end`);
	});

	it.each([
		[404, 'EC404', 'Resource not found'],
		[403, 'EC403', 'Forbidden: SESSION_END_REFUSED:CURRENT_SESSION']
	])(
		'a device that is signed in no more, or is this very one (%s %s): the list is read again with NO word of failure',
		async (status, code, message) => {
			const handle = await draw();
			server.end = () => {
				sessionsData = sessionsData.filter((entry) => entry.sessionId !== LAPTOP);
				return refusal(status, code, message);
			};
			await user().click(screen.getByTestId('security-session-1-end'));
			await waitFor(() => expect(screen.queryByTestId('security-session-2')).toBeNull());
			expect(reads('sessions')).toBe(2);
			expect(toast()).toBeUndefined();
			expect(handle().status()).toBe('member');
			expect(document.body.textContent).not.toContain('SESSION_END_REFUSED');
		}
	);

	it.each([
		[429, 'EC429', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		[500, 'EC500', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[401, 'EC412', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[403, 'EC403', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.']
	])(
		'(negative) an end refused with %s %s says «%s» in passing; the device stays on the list, the person signed in, and the press is free again',
		async (status, code, words) => {
			const handle = await draw();
			server.end = () => refusal(status, code, 'Forbidden');
			await user().click(screen.getByTestId('security-session-1-end'));
			await waitFor(() => expect(toast()).toBe(words));
			expect(toastTone()).toBe('danger');
			expect(screen.getByTestId('security-session-1')).toHaveTextContent('macOS · Chrome');
			expect(screen.getByTestId('security-session-1')).not.toHaveAttribute('data-pending');
			expect(handle().status()).toBe('member');
			expect(reads('sessions')).toBe(1);
			await user().click(screen.getByTestId('security-session-1-end'));
			await waitFor(() => expect(writes()).toHaveLength(2));
		}
	);

	it('🔴 U-84: `401 EC401` at the end of a device is the session’s end — the sign-in opens, nothing says the device went', async () => {
		const handle = await draw();
		server.end = () => refusal(401, 'EC401', 'Unauthorized');
		await user().click(screen.getByTestId('security-session-1-end'));
		await waitFor(() => expect(handle().status()).toBe('guest'));
		expect(handle().session.flowOpen).toBe(true);
		expect(toast()).toBeUndefined();
	});

	it('🔴 D-W45-35 (negative): a word of the server the page does not know does not break it — «Άγνωστη συσκευή», a half-known device by the half it knows, markup as nothing; an id that is not the server’s is no row', async () => {
		sessionsData = [
			device({ sessionId: HERE, current: true, kind: 'WATCH', os: 'WATCHOS', browser: 'OPERA' }),
			device({ os: '<img src=x onerror=alert(1)>', browser: 'CHROME' }),
			device({
				sessionId: OFFICE,
				kind: 'APP',
				os: 'HARMONYOS',
				browser: null,
				lastActiveAt: 'soon'
			}),
			device({ sessionId: '../logout' }),
			null,
			'x'
		] as Record<string, unknown>[];
		await draw();
		const rows = [...screen.getByTestId('security-sessions').querySelectorAll('li')];
		expect(rows.map((row) => row.querySelector('h4')?.textContent?.trim())).toEqual([
			'Άγνωστη συσκευή',
			'Chrome',
			'εφαρμογή eDoctor'
		]);
		expect(rows[2].querySelector('p')).toBeNull();
		expect(document.body.querySelector('img')).toBeNull();
		expect(document.body.textContent).not.toMatch(/WATCH|HARMONY|OPERA|OTHER|logout/u);
	});
});
