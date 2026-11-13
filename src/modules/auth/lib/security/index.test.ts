import { describe, expect, it } from 'vitest';
import {
	sessionDeviceBrowsers,
	sessionDeviceKinds,
	sessionDeviceSystems,
	type AccountSessionFacts
} from '$modules/auth/api/sessions';
import { ioniconNames } from '$shared/ui/icons/ionicon';
import {
	buildSecurityPasswordRow,
	buildSecurityProviderRows,
	buildSecuritySessionRows,
	cleanSecurityCode,
	securityActionFailureWords,
	securityCodeError,
	securityCodeSendFailureWords,
	securityCurrentPasswordError,
	securityDeviceIcon,
	securityDeviceName,
	securityNewPasswordError,
	securityPasswordFailureWords,
	securityPasswordHelp,
	securityProviderRefusal,
	securityResendDeadline,
	securityResendSecondsLeft,
	securityResendWaitLabel,
	securitySessionWhen,
	securityUnlinkWords
} from '.';

/*
 * Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια» (record §5.4; D-W45-35, D-W45-37 … 40): what the page prints, from the
 * server's facts. The Greek is the approved prototype's, word for word (U-140).
 */

const el = { locale: 'el' } as const;
const en = { locale: 'en' } as const;

describe('auth::lib::security · the row «Κωδικός πρόσβασης» (D-W45-37, D-W45-39)', () => {
	it('set ⇒ «Έχει οριστεί · Αλλαγή», the change; «Ξέχασα τον κωδικό μου» only where a code can be mailed', () => {
		expect(buildSecurityPasswordRow({ set: true, canSet: true }, el)).toEqual({
			set: true,
			value: 'Έχει οριστεί',
			opens: 'change',
			actionLabel: 'Αλλαγή',
			hint: null,
			canForget: true
		});
		expect(buildSecurityPasswordRow({ set: true, canSet: false }, el)).toEqual({
			set: true,
			value: 'Έχει οριστεί',
			opens: 'change',
			actionLabel: 'Αλλαγή',
			hint: null,
			canForget: false
		});
	});

	it('not set, a code can be mailed ⇒ «Δεν έχει οριστεί · Ορισμός», the mailed code', () => {
		expect(buildSecurityPasswordRow({ set: false, canSet: true }, el)).toEqual({
			set: false,
			value: 'Δεν έχει οριστεί',
			opens: 'code',
			actionLabel: 'Ορισμός',
			hint: null,
			canForget: false
		});
	});

	it('🔴 D-W45-39: not set and no sign-in email ⇒ «Δεν έχει οριστεί» with NO «Ορισμός», and the line that says what to do', () => {
		expect(buildSecurityPasswordRow({ set: false, canSet: false }, el)).toEqual({
			set: false,
			value: 'Δεν έχει οριστεί',
			opens: null,
			actionLabel: null,
			hint: 'Προσθέστε email στα «Προσωπικά στοιχεία» για να ορίσετε κωδικό πρόσβασης.',
			canForget: false
		});
	});

	it('in English', () => {
		expect(buildSecurityPasswordRow({ set: true, canSet: true }, en)).toMatchObject({
			value: 'Set',
			actionLabel: 'Change'
		});
		expect(buildSecurityPasswordRow({ set: false, canSet: true }, en)).toMatchObject({
			value: 'Not set',
			actionLabel: 'Set up'
		});
		expect(buildSecurityPasswordRow({ set: false, canSet: false }, en).hint).toBe(
			'Add an email in “Personal details” to set a password.'
		);
	});

	it('the open row’s line of help: the change says what it does; 🔴 U-168 the code says the address as the SERVER hides it, or none', () => {
		expect(securityPasswordHelp('change', 'e***a@example.gr', el)).toBe(
			'Μετά την αλλαγή αποσυνδέεστε από τις άλλες συσκευές σας.'
		);
		expect(securityPasswordHelp('code', 'e***a@example.gr', el)).toBe(
			'Καταχωρίστε τον κωδικό που στείλαμε στο email σας (e***a@example.gr) και επιλέξτε τον κωδικό πρόσβασης με τον οποίο θα συνδέεστε.'
		);
		for (const none of [null, undefined, '', '   ']) {
			expect(securityPasswordHelp('code', none, el)).toBe(
				'Καταχωρίστε τον κωδικό που στείλαμε στο email σας και επιλέξτε τον κωδικό πρόσβασης με τον οποίο θα συνδέεστε.'
			);
		}
		expect(securityPasswordHelp('code', 'e***a@example.gr', en)).toBe(
			'Enter the code we sent to your email (e***a@example.gr) and choose the password you will sign in with.'
		);
	});
});

describe('auth::lib::security · the page’s own checks and the refusals’ words', () => {
	it('the current password: asked for when empty; one no password can be is not the account’s; anything else goes to the server', () => {
		expect(securityCurrentPasswordError('', el)).toBe('Γράψτε τον τρέχοντα κωδικό πρόσβασης.');
		expect(securityCurrentPasswordError('short', el)).toBe('Ο κωδικός πρόσβασης δεν είναι σωστός.');
		expect(securityCurrentPasswordError('1234567', el)).toBe(
			'Ο κωδικός πρόσβασης δεν είναι σωστός.'
		);
		// The current one is never held to today's rule of strength: an older password may be plain.
		expect(securityCurrentPasswordError('12345678', el)).toBeUndefined();
		expect(securityCurrentPasswordError('        ', el)).toBeUndefined();
	});

	it('a new password: at least 8 characters (the record’s words), then the sign-in’s own rule of strength', () => {
		expect(securityNewPasswordError('', el)).toBe(
			'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
		);
		expect(securityNewPasswordError('Abc1', el)).toBe(
			'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
		);
		expect(securityNewPasswordError('abcdefgh', el)).toBe(
			'Χρησιμοποιήστε κεφαλαία, πεζά και έναν αριθμό ή σύμβολο'
		);
		expect(securityNewPasswordError('Made-up pass 1', el)).toBeUndefined();
	});

	it('🔴 U-65.6: the code as its field keeps it — digits alone, six at most; and its own check «Ο κωδικός έχει 6 ψηφία.»', () => {
		expect(cleanSecurityCode('12 34-56')).toBe('123456');
		expect(cleanSecurityCode('1234567890')).toBe('123456');
		expect(cleanSecurityCode('abc<script>')).toBe('');
		expect(cleanSecurityCode('１２３４５６')).toBe('');
		expect(cleanSecurityCode('9'.repeat(4096))).toBe('999999');
		expect(securityCodeError('', el)).toBe('Ο κωδικός έχει 6 ψηφία.');
		expect(securityCodeError('12345', el)).toBe('Ο κωδικός έχει 6 ψηφία.');
		expect(securityCodeError('123456', el)).toBeUndefined();
	});

	it('a refused write: under the field it speaks of, or over the form; never the server’s own words', () => {
		expect(securityPasswordFailureWords('wrong-password', el)).toEqual({
			field: 'current',
			message: 'Ο κωδικός πρόσβασης δεν είναι σωστός.'
		});
		expect(securityPasswordFailureWords('invalid-code', el)).toEqual({
			field: 'code',
			message: 'Ο κωδικός δεν είναι σωστός. Δοκιμάστε ξανά.'
		});
		expect(securityPasswordFailureWords('stale-code', el)).toEqual({
			field: 'code',
			message: 'Ο κωδικός έληξε. Ζητήστε καινούριο.'
		});
		expect(securityPasswordFailureWords('invalid-value', el)).toEqual({
			field: 'new',
			message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
		});
		expect(securityPasswordFailureWords('locked', el)).toEqual({
			field: null,
			message: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.'
		});
		expect(securityPasswordFailureWords('rate-limited', el)).toEqual({
			field: null,
			message: 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		});
		expect(securityPasswordFailureWords('unavailable', el)).toEqual({
			field: null,
			message: 'Δεν μπορούμε να ορίσουμε κωδικό πρόσβασης για αυτόν τον λογαριασμό.'
		});
		expect(securityPasswordFailureWords('unknown', el)).toEqual({
			field: null,
			message: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'
		});
		// The session, and an account with no password after all, are the page's own to handle: they have no words.
		expect(securityPasswordFailureWords('session', el)).toBeNull();
		expect(securityPasswordFailureWords('no-password', el)).toBeNull();
	});

	it('a code that could not be mailed, and a press that did not go through', () => {
		expect(securityCodeSendFailureWords('rate-limited', el)).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(securityCodeSendFailureWords('unavailable', el)).toBe(
			'Δεν μπορούμε να ορίσουμε κωδικό πρόσβασης για αυτόν τον λογαριασμό.'
		);
		expect(securityCodeSendFailureWords('unknown', el)).toBe('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
		expect(securityCodeSendFailureWords('session', el)).toBeNull();
		expect(securityActionFailureWords('rate-limited', el)).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		expect(securityActionFailureWords('unknown', el)).toBe('Κάτι πήγε στραβά. Δοκιμάστε ξανά.');
	});

	it('«Αποστολή ξανά»: the server’s 60″ after a send, told in whole seconds by the page’s own clock', () => {
		const sent = 1_800_000_000_000;
		const deadline = securityResendDeadline(sent);
		expect(deadline - sent).toBe(60_000);
		expect(securityResendSecondsLeft(deadline, sent)).toBe(60);
		expect(securityResendSecondsLeft(deadline, sent + 18_400)).toBe(42);
		expect(securityResendSecondsLeft(deadline, sent + 59_999)).toBe(1);
		expect(securityResendSecondsLeft(deadline, sent + 60_000)).toBe(0);
		expect(securityResendSecondsLeft(deadline, sent + 600_000)).toBe(0);
		expect(securityResendSecondsLeft(null, sent)).toBe(0);
		expect(securityResendWaitLabel(42, el)).toBe('Περιμένετε 42 δευτερόλεπτα για νέο κωδικό.');
		expect(securityResendWaitLabel(1, el)).toBe('Περιμένετε 1 δευτερόλεπτο για νέο κωδικό.');
		expect(securityResendWaitLabel(1, en)).toBe('Wait 1 second before asking for a new code.');
	});
});

describe('auth::lib::security · «Σύνδεση με Google ή Apple» (D-W45-38)', () => {
	it('a linked provider as a row: its name, «Συνδεδεμένο», whether it may go, and the words for one that may not', () => {
		expect(
			buildSecurityProviderRows(
				[
					{ provider: 'GOOGLE', canUnlink: true },
					{ provider: 'APPLE', canUnlink: false }
				],
				el
			)
		).toEqual([
			{
				provider: 'GOOGLE',
				slug: 'google',
				name: 'Google',
				status: 'Συνδεδεμένο',
				canUnlink: true,
				refusal:
					'Για να αποσυνδέσετε το Google, προσθέστε πρώτα ένα κινητό στα «Προσωπικά στοιχεία», ώστε να έχετε τρόπο να συνδέεστε.'
			},
			{
				provider: 'APPLE',
				slug: 'apple',
				name: 'Apple',
				status: 'Συνδεδεμένο',
				canUnlink: false,
				refusal:
					'Για να αποσυνδέσετε το Apple, προσθέστε πρώτα ένα κινητό στα «Προσωπικά στοιχεία», ώστε να έχετε τρόπο να συνδέεστε.'
			}
		]);
		expect(buildSecurityProviderRows([], el)).toEqual([]);
		expect(securityProviderRefusal('APPLE', en)).toBe(
			'To disconnect Apple, first add a mobile in “Personal details”, so that you still have a way to sign in.'
		);
	});

	it('the question, its line and the passing word, with the provider’s own name', () => {
		expect(securityUnlinkWords('GOOGLE', el)).toEqual({
			title: 'Αποσύνδεση του Google;',
			body: 'Δεν θα μπορείτε πια να συνδέεστε στο eDoctor με το Google. Θα συνδέεστε με το email σας.',
			done: 'Το Google αποσυνδέθηκε.'
		});
		expect(securityUnlinkWords('APPLE', el)).toEqual({
			title: 'Αποσύνδεση του Apple;',
			body: 'Δεν θα μπορείτε πια να συνδέεστε στο eDoctor με το Apple. Θα συνδέεστε με το email σας.',
			done: 'Το Apple αποσυνδέθηκε.'
		});
		expect(securityUnlinkWords('GOOGLE', en)).toEqual({
			title: 'Disconnect Google?',
			body: 'You will no longer be able to sign in to eDoctor with Google. You will sign in with your email.',
			done: 'Google was disconnected.'
		});
	});
});

describe('auth::lib::security · «Συσκευές» (D-W45-35, D-W45-40)', () => {
	const device = (
		kind: AccountSessionFacts['kind'],
		os: AccountSessionFacts['os'],
		browser: AccountSessionFacts['browser']
	) => ({ kind, os, browser });

	it('the record’s examples: «iPhone · εφαρμογή eDoctor», «iPad · εφαρμογή eDoctor», «Android · εφαρμογή eDoctor», «macOS · Chrome», «Windows · Edge»', () => {
		expect(securityDeviceName(device('APP', 'IOS', null), el)).toBe('iPhone · εφαρμογή eDoctor');
		expect(securityDeviceName(device('APP', 'IPADOS', null), el)).toBe('iPad · εφαρμογή eDoctor');
		expect(securityDeviceName(device('APP', 'ANDROID', null), el)).toBe(
			'Android · εφαρμογή eDoctor'
		);
		expect(securityDeviceName(device('WEB', 'MACOS', 'CHROME'), el)).toBe('macOS · Chrome');
		expect(securityDeviceName(device('WEB', 'WINDOWS', 'EDGE'), el)).toBe('Windows · Edge');
		expect(securityDeviceName(device('APP', 'IOS', null), en)).toBe('iPhone · eDoctor app');
	});

	it('every system with every browser has its words — a name for each value of the vocabularies', () => {
		const systems = {
			IOS: 'iPhone',
			IPADOS: 'iPad',
			ANDROID: 'Android',
			MACOS: 'macOS',
			WINDOWS: 'Windows',
			LINUX: 'Linux'
		} as const;
		const browsers = {
			CHROME: 'Chrome',
			SAFARI: 'Safari',
			FIREFOX: 'Firefox',
			EDGE: 'Edge'
		} as const;
		expect(Object.keys(systems)).toEqual([...sessionDeviceSystems]);
		expect(Object.keys(browsers)).toEqual([...sessionDeviceBrowsers]);
		for (const os of sessionDeviceSystems) {
			for (const browser of sessionDeviceBrowsers) {
				expect(securityDeviceName(device('WEB', os, browser), el)).toBe(
					`${systems[os]} · ${browsers[browser]}`
				);
			}
			expect(securityDeviceName(device('APP', os, null), el)).toBe(
				`${systems[os]} · εφαρμογή eDoctor`
			);
		}
	});

	it('🔴 D-W45-35: a device that names nothing, or whose kind the page does not know, is «Άγνωστη συσκευή»; one that names half says the half it knows — never `OTHER`, never a word of the server (the application’s rule, `w45-a6` Κ1)', () => {
		expect(securityDeviceName(device('WEB', 'OTHER', 'OTHER'), el)).toBe('Άγνωστη συσκευή');
		expect(securityDeviceName(device('WEB', 'OTHER', null), el)).toBe('Άγνωστη συσκευή');
		expect(securityDeviceName(device('OTHER', 'OTHER', 'OTHER'), el)).toBe('Άγνωστη συσκευή');
		expect(securityDeviceName(device('OTHER', 'OTHER', null), en)).toBe('Unknown device');
		expect(securityDeviceName(device('WEB', 'MACOS', 'OTHER'), el)).toBe('macOS');
		expect(securityDeviceName(device('WEB', 'LINUX', null), el)).toBe('Linux');
		expect(securityDeviceName(device('WEB', 'OTHER', 'FIREFOX'), el)).toBe('Firefox');
		expect(securityDeviceName(device('OTHER', 'WINDOWS', 'CHROME'), el)).toBe('Άγνωστη συσκευή');
		expect(securityDeviceName(device('APP', 'OTHER', null), el)).toBe('εφαρμογή eDoctor');
		for (const kind of [...sessionDeviceKinds, 'OTHER'] as const) {
			for (const os of [...sessionDeviceSystems, 'OTHER'] as const) {
				for (const browser of [...sessionDeviceBrowsers, 'OTHER', null] as const) {
					const name = securityDeviceName(device(kind, os, browser), el);
					expect(name, `${kind}/${os}/${browser}`).not.toMatch(/OTHER|undefined|null/u);
					expect(name.length).toBeGreaterThan(0);
				}
			}
		}
	});

	it('the glyph: a phone, a tablet, else a computer, by its system (the application’s rule) — each one the kit has', () => {
		expect(securityDeviceIcon(device('APP', 'IOS', null))).toBe('phone-portrait-outline');
		expect(securityDeviceIcon(device('APP', 'ANDROID', null))).toBe('phone-portrait-outline');
		expect(securityDeviceIcon(device('WEB', 'IOS', 'SAFARI'))).toBe('phone-portrait-outline');
		expect(securityDeviceIcon(device('APP', 'IPADOS', null))).toBe('tablet-portrait-outline');
		for (const os of ['MACOS', 'WINDOWS', 'LINUX'] as const) {
			expect(securityDeviceIcon(device('WEB', os, 'CHROME'))).toBe('laptop-outline');
		}
		expect(securityDeviceIcon(device('APP', 'OTHER', null))).toBe('laptop-outline');
		expect(securityDeviceIcon(device('WEB', 'OTHER', 'OTHER'))).toBe('laptop-outline');
		expect(securityDeviceIcon(device('OTHER', 'OTHER', null))).toBe('laptop-outline');
		for (const kind of [...sessionDeviceKinds, 'OTHER'] as const) {
			for (const os of [...sessionDeviceSystems, 'OTHER'] as const) {
				expect(ioniconNames).toContain(securityDeviceIcon(device(kind, os, null)));
			}
		}
	});

	it('when it was last active: the day in words and the time, on the platform’s clock (D-118) — «12 Νοεμβρίου 2026 στις 09:27»', () => {
		// 07:27 UTC is 09:27 in Athens in November (+2); 21:30 UTC on 30 June is 00:30 on 1 July there (+3).
		expect(securitySessionWhen(Date.parse('2026-11-12T07:27:00.000Z'), 'el')).toBe(
			'12 Νοεμβρίου 2026 στις 09:27'
		);
		expect(securitySessionWhen(Date.parse('2026-06-30T21:30:00.000Z'), 'el')).toBe(
			'1 Ιουλίου 2026 στις 00:30'
		);
		expect(securitySessionWhen(Date.parse('2026-11-12T07:27:00.000Z'), 'en')).toMatch(
			/12.*2026 at 09:27$/u
		);
		expect(securitySessionWhen(null, 'el')).toBeNull();
		expect(securitySessionWhen(Number.NaN, 'el')).toBeNull();
		expect(securitySessionWhen(Number.POSITIVE_INFINITY, 'el')).toBeNull();
	});

	it('the rows: the server’s order, numbered from 0 (the application’s ids), each with its glyph, its words and its time; a device with no time has none', () => {
		const rows = buildSecuritySessionRows(
			[
				{
					sessionId: '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a01',
					current: true,
					lastActiveAt: Date.parse('2026-11-12T07:27:00.000Z'),
					kind: 'APP',
					os: 'IOS',
					browser: null
				},
				{
					sessionId: '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a02',
					current: false,
					lastActiveAt: null,
					kind: 'WEB',
					os: 'OTHER',
					browser: 'OTHER'
				}
			],
			el
		);
		expect(rows).toEqual([
			{
				sessionId: '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a01',
				index: 0,
				current: true,
				icon: 'phone-portrait-outline',
				name: 'iPhone · εφαρμογή eDoctor',
				when: '12 Νοεμβρίου 2026 στις 09:27'
			},
			{
				sessionId: '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a02',
				index: 1,
				current: false,
				icon: 'laptop-outline',
				name: 'Άγνωστη συσκευή',
				when: null
			}
		]);
		expect(buildSecuritySessionRows([], el)).toEqual([]);
	});
});
