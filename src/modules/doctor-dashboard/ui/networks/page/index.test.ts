import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { sampleLanguagesServer } from '$modules/doctor-dashboard/api/languages/languages.sample';
import Harness from './networks.harness.svelte';

/*
 * Wave 5.2 · screen 82, the page of the four links (U-211, D-W52-67 / 70): the page with the server stubbed at `fetch`
 * (the module's precedent). Made-up addresses only.
 */

type Server = Parameters<typeof sampleLanguagesServer>[0];
type Field = 'website' | 'facebook' | 'instagram' | 'linkedin';

const FIELDS: Field[] = ['website', 'facebook', 'instagram', 'linkedin'];
const NONE = { website: null, facebook: null, instagram: null, linkedin: null };
const NOT_A_LINK = 'Αυτό δεν είναι σύνδεσμος.';
const NOT_HTTPS = 'Χρειάζεται ασφαλής σύνδεσμος (https://).';
const FAILED = 'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.';

function serve(start: Server = {}) {
	const server = sampleLanguagesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; toasts?: ToastState; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const onClose = vi.fn();
	const view = render(Harness, { props: { client, onClose, ...options } });
	return { client, onClose, ...view };
}

const ready = () => screen.findByTestId('doctor-networks');
const input = (field: Field) => screen.getByTestId(`doctor-networks-${field}`) as HTMLInputElement;
const values = () => Object.fromEntries(FIELDS.map((field) => [field, input(field).value]));
/** The words under a field (`''` for none), and whether the field is drawn as refused. */
const said = (field: Field) => {
	const id = input(field).getAttribute('aria-describedby');
	return (id ? document.getElementById(id)?.textContent?.trim() : '') ?? '';
};
const errors = () => Object.fromEntries(FIELDS.map((field) => [field, said(field)]));
const save = () => screen.getByTestId('doctor-networks-save');
const cancel = () => screen.getByTestId('doctor-networks-cancel');
const patches = (server: ReturnType<typeof serve>) =>
	server.callsOf('PATCH', '/doctor/profile/base');
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});
async function write(user: ReturnType<typeof userEvent.setup>, field: Field, text: string) {
	await user.clear(input(field));
	if (text) await user.type(input(field), text);
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('the four links of the doctor’s page (wave 5.2 · screen 82)', () => {
	it('🔴 U-102 · U-211.2 / D-W52-70: a PAGE, never a window — «Κοινωνικά δίκτυα», «Φαίνονται ως σύνδεσμοι στη σελίδα σας. Όλα είναι προαιρετικά.», the FOUR fields one under the other (website, Facebook, Instagram, LinkedIn — no other), each with the link the server keeps, how to fill them in, and «Άκυρο · Αποθήκευση»', async () => {
		const server = serve();
		open();
		const page = await ready();
		expect(page).toHaveAttribute('data-slot', 'step-screen');
		expect(page).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { level: 2, name: 'Κοινωνικά δίκτυα' })).toBeInTheDocument();
		expect(
			screen.getByText('Φαίνονται ως σύνδεσμοι στη σελίδα σας. Όλα είναι προαιρετικά.')
		).toBeInTheDocument();
		const form = screen.getByTestId('doctor-networks-form');
		expect(form.className).toContain('flex-col');
		expect(form.className).not.toMatch(/\bgrid-cols-|\bflex-row\b|flex-wrap/u);
		const fields = [...form.querySelectorAll('input')];
		expect(fields.map((field) => field.getAttribute('data-testid'))).toEqual([
			'doctor-networks-website',
			'doctor-networks-facebook',
			'doctor-networks-instagram',
			'doctor-networks-linkedin'
		]);
		expect(page.querySelectorAll('input, textarea, select')).toHaveLength(4);
		expect(
			fields.map((field) => form.querySelector(`label[for="${field.id}"]`)?.textContent?.trim())
		).toEqual(['Ιστοσελίδα', 'Facebook', 'Instagram', 'LinkedIn']);
		expect(values()).toEqual({
			website: 'https://www.example.gr',
			facebook: '',
			instagram: '',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		// 🔴 U-65.6: the server's bound on every field; a link is typed as it is — no capitals, no corrections.
		for (const field of fields) {
			expect(field).toHaveAttribute('maxlength', '2000');
			expect(field).toHaveAttribute('inputmode', 'url');
			expect(field).toHaveAttribute('autocomplete', 'off');
			expect(field).toHaveAttribute('autocapitalize', 'off');
			expect(field).toHaveAttribute('spellcheck', 'false');
			expect(field).not.toHaveAttribute('aria-invalid');
		}
		expect(screen.getByTestId('doctor-networks-hint').textContent?.trim()).toBe(
			'Επικολλήστε τον σύνδεσμο από τη σελίδα σας. Αν λείπει το https://, το βάζουμε εμείς.'
		);
		expect(cancel()).toHaveTextContent('Άκυρο');
		expect(save()).toHaveTextContent('Αποθήκευση');
		expect(save()).toBeEnabled();
		// «‹» to screen 82 below 950 only (U-217: none on the wide web).
		const back = screen.getByTestId('doctor-networks-back');
		expect(back).toHaveAttribute('href', '/doctor/profile/languages');
		expect(back.closest('div')).toHaveClass('split:hidden');
		// ONE read, naming no doctor; nothing written by opening the page.
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual([
			['GET', '/doctor/profile/base', '']
		]);
	});

	it('🔴 U-211 / D-W52-70: «Αποθήκευση» sends the four fields in ONE call of `PATCH /doctor/profile/base` — ONLY those four, `https://` added where it was missing, `null` for an empty one, no doctor named; done ⇒ the cache holds the server’s answer, «Το προφίλ μου» is read again, «Αποθηκεύτηκε.», and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const { client, onClose } = open({ toasts });
		await ready();
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await write(user, 'website', '');
		await write(user, 'facebook', ' www.facebook.com/eleni.pappa.example ');
		await write(user, 'instagram', 'https://www.instagram.com/eleni.pappa.example');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(patches(server)).toHaveLength(1);
		expect(patches(server)[0].body).toEqual({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: 'https://www.instagram.com/eleni.pappa.example',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(Object.keys(patches(server)[0].body as object)).toEqual(FIELDS);
		expect(patches(server)[0].search).toBe('');
		expect(JSON.stringify(patches(server)[0])).not.toMatch(
			/tenantUserId|doctorId|licen|appointment|notificationEmail/u
		);
		expect(client.getQueryData(doctorDashboardQueryKeys.profileLinks())).toEqual({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: 'https://www.instagram.com/eleni.pappa.example',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
	});

	it('🔴 U-211 / D-W52-70 (`sw.js` `soShowErr`): the page’s own rule speaks only once «Αποθήκευση» was pressed — then under ITS field, in the page’s words, and again at every keystroke; NOTHING is sent while a field is refused', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await write(user, 'facebook', 'https://www.instagram.com/eleni.pappa.example');
		await write(user, 'instagram', 'http://www.instagram.com/eleni.pappa.example');
		// Typed, and the focus left the fields: still not a word.
		await user.tab();
		expect(errors()).toEqual({ website: '', facebook: '', instagram: '', linkedin: '' });
		expect(input('facebook')).not.toHaveAttribute('aria-invalid');

		await user.click(save());
		expect(errors()).toEqual({
			website: '',
			facebook: 'Αυτός δεν είναι σύνδεσμος Facebook.',
			instagram: NOT_HTTPS,
			linkedin: ''
		});
		expect(input('facebook')).toHaveAttribute('aria-invalid', 'true');
		expect(input('instagram')).toHaveAttribute('aria-invalid', 'true');
		expect(input('website')).not.toHaveAttribute('aria-invalid');
		expect(patches(server)).toHaveLength(0);
		expect(onClose).not.toHaveBeenCalled();
		// What was typed stays, and each keystroke is checked from now on.
		expect(input('facebook').value).toBe('https://www.instagram.com/eleni.pappa.example');
		await write(user, 'instagram', 'www.instagram.com/eleni.pappa.example');
		expect(said('instagram')).toBe('');
		expect(said('facebook')).toBe('Αυτός δεν είναι σύνδεσμος Facebook.');
		await user.type(input('website'), ' x');
		expect(said('website')).toBe(NOT_A_LINK);
		await write(user, 'website', '');
		await write(user, 'facebook', 'https://www.facebook.com/eleni.pappa.example');
		expect(errors()).toEqual({ website: '', facebook: '', instagram: '', linkedin: '' });
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(patches(server)).toHaveLength(1);
		expect(patches(server)[0].body).toEqual({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: 'https://www.instagram.com/eleni.pappa.example',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
	});

	it('🔴 U-211 / D-W52-67 / 70 · U-65.6 (negative): every link the rule refuses is refused ON THE DEVICE and never leaves it — `evil.com/facebook.com`, `facebook.com.evil.com`, `fb.com@evil.com`, `http:`, an IP address, `localhost`, `.local`, `javascript:`, too long', async () => {
		const cases: [Field, string, string][] = [
			['facebook', 'https://evil.com/facebook.com', 'Αυτός δεν είναι σύνδεσμος Facebook.'],
			['facebook', 'https://facebook.com.evil.com', 'Αυτός δεν είναι σύνδεσμος Facebook.'],
			['facebook', 'https://fb.com@evil.com', NOT_A_LINK],
			['facebook', 'http://www.facebook.com/eleni', NOT_HTTPS],
			['instagram', 'https://evil.com/instagram.com', 'Αυτός δεν είναι σύνδεσμος Instagram.'],
			['instagram', 'https://m.instagram.com/eleni', 'Αυτός δεν είναι σύνδεσμος Instagram.'],
			['linkedin', 'https://linkedin.com.evil.com/in/eleni', 'Αυτός δεν είναι σύνδεσμος LinkedIn.'],
			['linkedin', 'https://user:pass@www.linkedin.com/in/eleni', NOT_A_LINK],
			['website', 'http://www.example.gr', NOT_HTTPS],
			['website', 'https://127.0.0.1', NOT_A_LINK],
			['website', '192.168.1.10', NOT_A_LINK],
			['website', 'https://localhost', NOT_A_LINK],
			['website', 'localhost:8080', NOT_A_LINK],
			['website', 'https://printer.local', NOT_A_LINK],
			['website', 'javascript:alert(1)', NOT_A_LINK],
			// Typed without `https://`: within the field's own bound, past the server's once the page adds it.
			['website', `www.example.gr/${'a'.repeat(1980)}`, 'Έως 2000 χαρακτήρες.']
		];
		const user = userEvent.setup({ delay: null });
		const server = serve({ links: NONE });
		const { onClose } = open();
		await ready();
		await user.click(save());
		await waitFor(() => expect(patches(server)).toHaveLength(1));
		expect(onClose).toHaveBeenCalledTimes(1);
		for (const [field, link, words] of cases) {
			// A long link is put in whole: the keyboard would take a minute to type it.
			input(field).focus();
			await user.clear(input(field));
			await user.paste(link);
			await user.click(save());
			expect(said(field), link).toBe(words);
			expect(input(field), link).toHaveAttribute('aria-invalid', 'true');
			await user.clear(input(field));
			expect(said(field), link).toBe('');
		}
		expect(patches(server)).toHaveLength(1);
		expect(server.links()).toEqual(NONE);
	});

	it('🔴 U-211 / D-W52-67: the server checks AGAIN — its codes `DOCTOR_<FIELD>_LINK_<REASON>` are said under THEIR field in the page’s words, what was typed STAYS, nothing is shown as saved; the words stay while the field holds that link and go when it changes', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve({ links: NONE });
		const { onClose } = open({ toasts });
		await ready();
		await write(user, 'website', 'www.example.gr');
		await write(user, 'facebook', 'www.facebook.com/eleni.pappa.example');
		await write(user, 'instagram', 'www.instagram.com/eleni.pappa.example');
		await write(user, 'linkedin', 'www.linkedin.com/in/eleni-pappa-example');
		server.refuse(
			'PATCH',
			'/doctor/profile/base',
			422,
			'Validation error: DOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK, DOCTOR_INSTAGRAM_LINK_NOT_HTTPS, DOCTOR_WEBSITE_LINK_NOT_A_PUBLIC_HOST, DOCTOR_LINKEDIN_LINK_TOO_LONG'
		);
		await user.click(save());
		await waitFor(() => expect(said('facebook')).not.toBe(''));
		expect(errors()).toEqual({
			website: NOT_A_LINK,
			facebook: 'Αυτός δεν είναι σύνδεσμος Facebook.',
			instagram: NOT_HTTPS,
			linkedin: 'Έως 2000 χαρακτήρες.'
		});
		expect(onClose).not.toHaveBeenCalled();
		expect(toasts.current).toBeNull();
		expect(screen.queryByTestId('doctor-networks-failure')).toBeNull();
		expect(values()).toEqual({
			website: 'www.example.gr',
			facebook: 'www.facebook.com/eleni.pappa.example',
			instagram: 'www.instagram.com/eleni.pappa.example',
			linkedin: 'www.linkedin.com/in/eleni-pappa-example'
		});
		expect(server.links()).toEqual(NONE);
		// The same links are not sent again: the server already said no.
		await user.click(save());
		expect(patches(server)).toHaveLength(1);
		// One field changes: its words go, the others' stay.
		await user.type(input('facebook'), '2');
		expect(said('facebook')).toBe('');
		expect(said('instagram')).toBe(NOT_HTTPS);
		// Back to the very link the server refused: its words are back.
		await user.type(input('facebook'), '{Backspace}');
		expect(said('facebook')).toBe('Αυτός δεν είναι σύνδεσμος Facebook.');
		await write(user, 'facebook', '');
		await write(user, 'instagram', '');
		await write(user, 'website', 'www.example.com');
		await write(user, 'linkedin', 'linkedin.com/in/eleni');
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(patches(server)).toHaveLength(2);
		expect(server.links()).toEqual({
			website: 'https://www.example.com',
			facebook: null,
			instagram: null,
			linkedin: 'https://linkedin.com/in/eleni'
		});
	});

	it('🔴 D-W52-70: a refusal that names no field is said over the buttons, what was typed KEPT and nothing shown as saved — 422, 429, 409, 403, 500 and a lost connection; the words go with the next keystroke', async () => {
		const cases: [number, string, string][] = [
			[
				422,
				'"website" length must be less than or equal to 2000 characters long',
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τους συνδέσμους και δοκιμάστε ξανά.'
			],
			[429, 'Too many requests', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
			[409, 'Conflict', FAILED],
			[403, 'Forbidden: Doctor licence is required before profile updates.', FAILED],
			[500, 'Internal', FAILED]
		];
		for (const [status, message, words] of cases) {
			const user = userEvent.setup({ delay: null });
			const toasts = new ToastState();
			const server = serve();
			const { onClose, unmount } = open({ toasts });
			await ready();
			await write(user, 'facebook', 'facebook.com/eleni');
			server.refuse('PATCH', '/doctor/profile/base', status, message);
			await user.click(save());
			const alert = await screen.findByTestId('doctor-networks-failure');
			expect(alert).toHaveAttribute('role', 'alert');
			expect(alert.textContent?.trim(), `${status} ${message}`).toBe(words);
			expect(onClose, String(status)).not.toHaveBeenCalled();
			expect(toasts.current, String(status)).toBeNull();
			expect(input('facebook').value).toBe('facebook.com/eleni');
			expect(errors()).toEqual({ website: '', facebook: '', instagram: '', linkedin: '' });
			expect(server.links().facebook).toBeNull();
			await user.type(input('facebook'), 'x');
			expect(screen.queryByTestId('doctor-networks-failure')).toBeNull();
			unmount();
		}
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open();
		await ready();
		await write(user, 'facebook', 'facebook.com/eleni');
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
		);
		await user.click(save());
		expect((await screen.findByTestId('doctor-networks-failure')).textContent?.trim()).toBe(FAILED);
		expect(onClose).not.toHaveBeenCalled();
		expect(server.links().facebook).toBeNull();
	});

	it('🔴 U-102 · D-W52-70: «Άκυρο» leaves and writes NOTHING, whatever was typed; ONE press, one write — a second press while the save is on its way sends nothing more', async () => {
		const user = userEvent.setup({ delay: null });
		const toasts = new ToastState();
		const server = serve();
		const left = open({ toasts });
		await ready();
		await write(user, 'facebook', 'facebook.com/eleni');
		await user.click(cancel());
		expect(left.onClose).toHaveBeenCalledTimes(1);
		expect(patches(server)).toHaveLength(0);
		expect(server.links().facebook).toBeNull();
		expect(toasts.current).toBeNull();
		left.unmount();

		const again = serve();
		const { onClose } = open({ toasts });
		await ready();
		await write(user, 'facebook', 'facebook.com/eleni');
		again.hold();
		await user.click(save());
		await waitFor(() => expect(patches(again)).toHaveLength(1));
		save().click();
		save().click();
		await user.keyboard('{Enter}');
		expect(patches(again)).toHaveLength(1);
		expect(onClose).not.toHaveBeenCalled();
		expect(toasts.current).toBeNull();
		again.release();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(patches(again)).toHaveLength(1);
	});

	it('🔴 D-W52-70: the fields open with the FIRST answer — a read that comes back later never writes over what is typed', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { client, onClose } = open();
		await ready();
		await write(user, 'website', 'www.example.com');
		server.set({ links: { website: 'https://other.example.gr', facebook: 'https://fb.com/x' } });
		await client.refetchQueries({ queryKey: doctorDashboardQueryKeys.profileLinks() });
		expect(values()).toEqual({
			website: 'www.example.com',
			facebook: '',
			instagram: '',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		await user.click(save());
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(patches(server)[0].body).toEqual({
			website: 'https://www.example.com',
			facebook: null,
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
	});

	it('🔴 U-65.6 (negative): a `401` on the read or on the save ends the session once and what was typed stays; a `403` / `404` on the read, or an answer that is no base profile, is a failed read with «Δοκιμάστε ξανά» and one way back — never four empty fields to save over', async () => {
		const expireRead = vi.fn();
		const refusedRead = serve();
		refusedRead.refuse('GET', '/doctor/profile/base', 401);
		const first = open({ session: member(expireRead) });
		await screen.findByTestId('doctor-networks-closed');
		expect(expireRead).toHaveBeenCalledTimes(1);
		first.unmount();

		const user = userEvent.setup({ delay: null });
		const expire = vi.fn();
		const server = serve();
		const saving = open({ session: member(expire) });
		await ready();
		await write(user, 'facebook', 'facebook.com/eleni');
		server.refuse('PATCH', '/doctor/profile/base', 401);
		await user.click(save());
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(saving.onClose).not.toHaveBeenCalled();
		expect(input('facebook').value).toBe('facebook.com/eleni');
		expect(screen.queryByTestId('doctor-networks-failure')).toBeNull();
		saving.unmount();

		for (const answer of [
			{ status: 403, body: { errorCode: 'EC403', errorMessage: 'Forbidden' } },
			{ status: 404, body: { errorCode: 'EC404', errorMessage: 'Not found' } },
			{ status: 200, data: { website: 7 } },
			{ status: 200, data: 'x' }
		]) {
			const quiet = vi.fn();
			const refused = serve();
			refused.plant('GET', '/doctor/profile/base', answer);
			refused.plant('GET', '/doctor/profile/base', answer);
			const view = open({ session: member(quiet) });
			expect(screen.getByTestId('doctor-networks-wait')).toBeInTheDocument();
			const closed = await screen.findByTestId('doctor-networks-closed');
			expect(quiet).not.toHaveBeenCalled();
			expect(within(closed).queryAllByRole('textbox')).toEqual([]);
			expect(screen.queryByTestId('doctor-networks-save')).toBeNull();
			expect(patches(refused)).toHaveLength(0);
			if (answer.status === 200) {
				screen.getByTestId('doctor-networks-retry').click();
				await ready();
				expect(input('website').value).toBe('https://www.example.gr');
			} else {
				screen.getByTestId('doctor-networks-leave').click();
				expect(view.onClose).toHaveBeenCalledTimes(1);
			}
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): what the server keeps and what is typed are a field’s VALUE — markup draws no element, and the page makes no address of a link (no link but «‹», nothing opened); the page’s language: the same page in English', async () => {
		const evil = '"><img src=x onerror=alert(1)>';
		const planted = serve({ links: { website: evil, linkedin: 'javascript:alert(1)' } });
		const view = open();
		const page = await ready();
		expect(page.querySelector('img, script')).toBeNull();
		expect(input('website').value).toBe(evil);
		expect(input('linkedin').value).toBe('javascript:alert(1)');
		expect([...page.querySelectorAll('a')].map((anchor) => anchor.getAttribute('href'))).toEqual([
			'/doctor/profile/languages'
		]);
		expect(page.innerHTML).not.toMatch(/target=|href="(?:https?:|javascript:)/iu);
		// What the server kept before the rule existed is refused on the device like anything typed.
		const user = userEvent.setup({ delay: null });
		await user.click(save());
		expect(said('website')).toBe(NOT_A_LINK);
		expect(said('linkedin')).toBe(NOT_A_LINK);
		expect(patches(planted)).toHaveLength(0);
		view.unmount();

		const server = serve();
		open({ locale: 'en' });
		const english = await ready();
		expect(screen.getByRole('heading', { level: 2, name: 'Social networks' })).toBeInTheDocument();
		expect(
			screen.getByText('They show as links on your page. All of them are optional.')
		).toBeInTheDocument();
		expect(
			[...english.querySelectorAll('label')].map((label) => label.textContent?.trim())
		).toEqual(['Website', 'Facebook', 'Instagram', 'LinkedIn']);
		expect(screen.getByTestId('doctor-networks-hint').textContent?.trim()).toBe(
			'Paste the link from your page. If https:// is missing, we add it.'
		);
		await write(user, 'facebook', 'https://www.instagram.com/eleni');
		await user.click(save());
		expect(said('facebook')).toBe('This is not a Facebook link.');
		expect(patches(server)).toHaveLength(0);
		// U-128 · U-100: colours only of the kit.
		expect(english.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|style="[^"]*color/iu);
	});
});
