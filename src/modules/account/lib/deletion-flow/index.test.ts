import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DeletionPreviewFacts } from '$modules/account/api/deletion';
import {
	buildDeletionPreview,
	cleanDeletionCode,
	deletionDestination,
	deletionFailureMessage,
	deletionResendWait
} from '.';

/*
 * Wave 4.5 · screen 62 (D-W45-30, D-W45-31): what «Διαγραφή λογαριασμού» prints, from the server's own codes — the
 * application's words (`profile.accountDeletion.*`), with «κριτικές» wherever a reader meets the word (U-173).
 */

const facts = (overrides: Partial<DeletionPreviewFacts> = {}): DeletionPreviewFacts => ({
	allowed: true,
	refusal: null,
	codeChannel: 'email',
	codeDestinationMasked: 'e***a@example.gr',
	removed: [],
	warnings: [],
	retained: [],
	...overrides
});

const messages = (locale: 'el' | 'en') =>
	JSON.parse(readFileSync(resolve(process.cwd(), `messages/${locale}.json`), 'utf8')) as Record<
		string,
		string
	>;

describe('account/lib/deletion-flow · «Τι σβήνεται αμέσως»', () => {
	it('the sign-in details first — every account loses them — then the server’s kinds in ITS order, each with its count by the one number rule', () => {
		const preview = buildDeletionPreview(
			facts({
				removed: [
					{ item: 'profiles', count: 1 },
					{ item: 'patientProfiles', count: 1 },
					{ item: 'relatives', count: 2 },
					{ item: 'appointmentsCanceled', count: 1234 },
					{ item: 'ratings', count: 3 },
					{ item: 'favoriteDoctors', count: 5 },
					{ item: 'conversations', count: 4 }
				]
			}),
			'el'
		);
		expect(preview.removed.map((line) => [line.id, line.text, line.meta])).toEqual([
			['account', 'Τα στοιχεία σύνδεσης (email, κινητό, κωδικός, σύνδεση με Google ή Apple)', null],
			['profiles', 'Το προφίλ σας (όνομα, ημερομηνία γέννησης, φωτογραφία)', '1'],
			['patientProfiles', 'Τα στοιχεία ασθενή σας (ΑΜΚΑ, ΑΦΜ)', '1'],
			['relatives', 'Μέλη οικογένειας', '2'],
			[
				'appointmentsCanceled',
				'Ραντεβού και αιτήματα που ακυρώνονται, και των μελών οικογένειας',
				'1.234'
			],
			['ratings', 'Κριτικές που γράψατε', '3'],
			['favoriteDoctors', 'Οι αγαπημένοι γιατροί σας', '5'],
			['conversations', 'Οι συνομιλίες σας, και από την πλευρά του άλλου', '4']
		]);
		expect(preview.removed.every((line) => line.detail === null)).toBe(true);
	});

	it('🔴 U-173: Κριτικές που γράψατε — the line of the reviews says «Κριτικές», in English «Reviews you wrote» (D-W45-31)', () => {
		const line = (locale: 'el' | 'en') =>
			buildDeletionPreview(facts({ removed: [{ item: 'ratings', count: 2 }] }), locale).removed[1];
		expect(line('el')).toMatchObject({ id: 'ratings', text: 'Κριτικές που γράψατε', meta: '2' });
		expect(line('en')).toMatchObject({ id: 'ratings', text: 'Reviews you wrote' });
	});

	it('🔴 U-173 (negative): ΜΙΑ λέξη παντού — no word of the whole flow, in either language, says «αξιολόγ…» or “rating”', () => {
		for (const locale of ['el', 'en'] as const) {
			const flow = Object.entries(messages(locale)).filter(
				([key]) => key.startsWith('profile_account_deletion_') || key.startsWith('profile_privacy_')
			);
			expect(flow.length).toBeGreaterThan(100);
			for (const [key, text] of flow) {
				expect(text, key).not.toMatch(/αξιολ[οό]γ|\brating/iu);
			}
		}
		const everything = buildDeletionPreview(
			facts({
				removed: [
					'ratings',
					'receivedRatings',
					'ratingInvitationsRevoked',
					'doctorRatingInvitationsRevoked'
				].map((item) => ({ item, count: 1 })),
				retained: [
					{ category: 'RATING_MODERATION', purpose: 'MODERATION_EVIDENCE', maxRetentionYears: 5 }
				]
			}),
			'el'
		);
		const said = [...everything.removed, ...everything.retained]
			.flatMap((line) => [line.text, line.detail])
			.join(' ');
		expect(said).toContain('Κριτικές που λάβατε');
		expect(said).toContain('Προσκλήσεις κριτικής');
		expect(said).toContain('κριτικές που ελέγξαμε');
		expect(said).not.toMatch(/αξιολ[οό]γ/iu);
	});

	it('🔴 D-W45-47 (card w45-w7, screen 63): «Ειδοποιήσεις» — the lines of the notification list go with the account: a line of its own with its count, in the place the server gives it (after the devices); in English «Notifications»; none when nothing is there', () => {
		const removed = [
			{ item: 'notificationPreferences', count: 6 },
			{ item: 'pushDevices', count: 2 },
			{ item: 'notificationInboxItems', count: 1234 },
			{ item: 'relatives', count: 1 }
		];
		const lines = (locale: 'el' | 'en') =>
			buildDeletionPreview(facts({ removed }), locale).removed.map((line) => [
				line.id,
				line.text,
				line.meta
			]);
		expect(lines('el').slice(2)).toEqual([
			['pushDevices', 'Οι συσκευές που λαμβάνουν ειδοποιήσεις', '2'],
			['notificationInboxItems', 'Ειδοποιήσεις', '1.234'],
			['relatives', 'Μέλη οικογένειας', '1']
		]);
		expect(lines('en').find(([id]) => id === 'notificationInboxItems')).toEqual([
			'notificationInboxItems',
			'Notifications',
			'1,234'
		]);
		// It has words of its own: it is never summed into «Άλλα στοιχεία του λογαριασμού».
		expect(lines('el').some(([id]) => id === 'other')).toBe(false);
		// The server sends the line always, with `0` too: a kind that removes nothing is not listed.
		expect(
			buildDeletionPreview(
				facts({ removed: [{ item: 'notificationInboxItems', count: 0 }] }),
				'el'
			).removed.map((line) => line.id)
		).toEqual(['account']);
	});

	it('a kind that removes nothing is not listed; kinds this build has no words for are summed into ONE line, never hidden and never named by their code', () => {
		const preview = buildDeletionPreview(
			facts({
				removed: [
					{ item: 'questions', count: 0 },
					{ item: 'futureKind', count: 2 },
					{ item: 'relatives', count: 1 },
					{ item: 'anotherNewKind', count: 3 },
					{ item: 'toString', count: 1 },
					{ item: 'constructor', count: 1 }
				]
			}),
			'el'
		);
		expect(preview.removed.map((line) => [line.id, line.text, line.meta])).toEqual([
			['account', expect.any(String), null],
			['relatives', 'Μέλη οικογένειας', '1'],
			['other', 'Άλλα στοιχεία του λογαριασμού', '7']
		]);
		expect(JSON.stringify(preview)).not.toMatch(/futureKind|anotherNewKind|\[native code\]/u);
	});

	it('a doctor’s account reads its own kinds too (the server sends them): the public profile, the offices, the till', () => {
		const preview = buildDeletionPreview(
			facts({
				removed: [
					{ item: 'doctorProfiles', count: 1 },
					{ item: 'offices', count: 2 },
					{ item: 'erpItems', count: 12 },
					{ item: 'calendarConnections', count: 1 }
				]
			}),
			'el'
		);
		expect(preview.removed.map((line) => line.text).slice(1)).toEqual([
			'Το δημόσιο προφίλ γιατρού (βγαίνει αμέσως από την αναζήτηση)',
			'Τα ιατρεία, τα ωράρια και οι υπηρεσίες σας',
			'Είδη του ταμείου σας',
			'Συνδέσεις ημερολογίου (σβήνονται τα αντίγραφα του eDoctor)'
		]);
	});
});

describe('account/lib/deletion-flow · «Πριν συνεχίσετε», «Τι κρατάμε, γιατί και για πόσο», the refusal, the code', () => {
	it('each warning in its own words; one newer than this build is a caution, never its code', () => {
		const preview = buildDeletionPreview(
			facts({
				warnings: ['MESSAGES_COPY_BEFORE_DELETION', 'APPOINTMENTS_IN_PROGRESS', 'NEW_WARNING']
			}),
			'el'
		);
		expect(preview.warnings.map((line) => line.text)).toEqual([
			'Οι συνομιλίες σας σβήνονται και από την πλευρά του άλλου. Αν θέλετε αντίγραφο, κατεβάστε το πρώτα από κάθε συνομιλία.',
			'Ραντεβού που έχει ήδη ξεκινήσει ή όπου δηλώθηκε η άφιξή σας δεν ακυρώνεται: μένει στον γιατρό σας.',
			'Ελέγξτε τα στοιχεία σας πριν συνεχίσετε.'
		]);
	});

	it('what stays: WHAT, WHY and for HOW LONG at most — the years’ singular only for one; an unknown category or purpose keeps the law’s words', () => {
		const preview = buildDeletionPreview(
			facts({
				retained: [
					{ category: 'LEGAL_ACCEPTANCE', purpose: 'LEGAL_CLAIMS_EVIDENCE', maxRetentionYears: 5 },
					{ category: 'DELETION_TRACE', purpose: 'DELETION_ACCOUNTABILITY', maxRetentionYears: 1 },
					{ category: 'NEW_CATEGORY', purpose: 'NEW_PURPOSE', maxRetentionYears: 10 }
				]
			}),
			'el'
		);
		expect(preview.retained).toEqual([
			{
				id: 'LEGAL_ACCEPTANCE',
				text: 'Η απόδειξη ότι αποδεχθήκατε τους Όρους Χρήσης και την Πολιτική Απορρήτου',
				detail: 'Για να μπορούμε να αποδείξουμε ότι τηρήσαμε τον νόμο σε ενδεχόμενη διαφορά.',
				meta: 'Έως 5 έτη, και μετά σβήνεται ή ανωνυμοποιείται αυτόματα.'
			},
			{
				id: 'DELETION_TRACE',
				text: 'Το ίχνος της διαγραφής, χωρίς όνομα, email, κινητό ή στοιχεία υγείας',
				detail: 'Για να μπορούμε να αποδείξουμε ότι η διαγραφή έγινε.',
				meta: 'Έως 1 έτος, και μετά σβήνεται ή ανωνυμοποιείται αυτόματα.'
			},
			{
				id: 'NEW_CATEGORY',
				text: 'Στοιχεία που ο νόμος μάς υποχρεώνει να κρατήσουμε',
				detail: 'Γιατί το ορίζει ο νόμος.',
				meta: 'Έως 10 έτη, και μετά σβήνεται ή ανωνυμοποιείται αυτόματα.'
			}
		]);
	});

	it('an account that may be deleted is told where the code goes — the server’s mask, else its channel’s words — and has no refusal', () => {
		expect(buildDeletionPreview(facts(), 'el')).toMatchObject({
			refusal: null,
			codeNotice: 'Για να βεβαιωθούμε ότι είστε εσείς, θα στείλουμε κωδικό στο e***a@example.gr.'
		});
		expect(
			buildDeletionPreview(facts({ codeDestinationMasked: null, codeChannel: 'phone' }), 'el')
				.codeNotice
		).toBe('Για να βεβαιωθούμε ότι είστε εσείς, θα στείλουμε κωδικό στο κινητό σας.');
		expect(
			buildDeletionPreview(facts({ codeDestinationMasked: null, codeChannel: null }), 'en')
				.codeNotice
		).toBe('To make sure it is you, we will send a code to your email.');
		expect(deletionDestination(null, 'email', 'el')).toBe('email σας');
		expect(deletionDestination('+30 69•• ••• 678', 'phone', 'el')).toBe('+30 69•• ••• 678');
	});

	it.each([
		[
			'BACKOFFICE_ACCOUNT',
			'Ο λογαριασμός σας είναι λογαριασμός διαχείρισης: τον διαγράφει μόνο άλλος διαχειριστής.'
		],
		[
			'NO_VERIFIED_CHANNEL',
			'Για να επιβεβαιώσουμε ότι είστε εσείς, αποσυνδεθείτε και συνδεθείτε ξανά με κωδικό στο email ή στο κινητό σας· αλλιώς επικοινωνήστε με την υποστήριξη.'
		],
		[
			'A_NEW_REASON',
			'Αυτός ο λογαριασμός δεν διαγράφεται από τον ιστότοπο. Επικοινωνήστε με την υποστήριξη.'
		],
		[null, 'Αυτός ο λογαριασμός δεν διαγράφεται από τον ιστότοπο. Επικοινωνήστε με την υποστήριξη.']
	] as const)(
		'a refused account reads its reason (%s) and is told NOTHING of a code',
		(refusal, words) => {
			const preview = buildDeletionPreview(
				facts({ allowed: false, refusal, codeChannel: null, codeDestinationMasked: null }),
				'el'
			);
			expect(preview.refusal).toBe(words);
			expect(preview.codeNotice).toBeNull();
		}
	);

	it('(negative) an allowed account never reads a refusal, whatever reason came with it', () => {
		expect(buildDeletionPreview(facts({ refusal: 'BACKOFFICE_ACCOUNT' }), 'el').refusal).toBeNull();
	});
});

describe('account/lib/deletion-flow · a refused call, the resend, the code', () => {
	it.each([
		['invalid-code', 'confirm', 'Ο κωδικός δεν είναι σωστός. Ελέγξτε τον και δοκιμάστε ξανά.'],
		['stale-code', 'confirm', 'Ο κωδικός έληξε ή έχει ήδη χρησιμοποιηθεί. Ζητήστε νέο κωδικό.'],
		['locked', 'confirm', 'Πολλές λανθασμένες προσπάθειες. Δοκιμάστε ξανά αργότερα.'],
		['rate-limited', 'confirm', 'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'],
		['rate-limited', 'send', 'Στείλαμε πολλούς κωδικούς. Δοκιμάστε ξανά αργότερα.'],
		[
			'unreachable',
			'send',
			'Δεν ήταν δυνατή η σύνδεση με το eDoctor. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		],
		['unknown', 'send', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		['session-ended', 'send', 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.'],
		[
			'backoffice',
			'send',
			'Ο λογαριασμός σας είναι λογαριασμός διαχείρισης: τον διαγράφει μόνο άλλος διαχειριστής.'
		],
		[
			'no-channel',
			'send',
			'Για να επιβεβαιώσουμε ότι είστε εσείς, αποσυνδεθείτε και συνδεθείτε ξανά με κωδικό στο email ή στο κινητό σας· αλλιώς επικοινωνήστε με την υποστήριξη.'
		]
	] as const)('%s on the %s: its own sentence', (kind, step, words) => {
		expect(deletionFailureMessage(kind, step, 'el')).toBe(words);
	});

	it('🔴 a CONFIRM with no answer the page can read is not «no connection»: the account may be gone, so the reader is told so and asked to press again', () => {
		const words =
			'Δεν πήραμε απάντηση, οπότε δεν ξέρουμε αν ο λογαριασμός διαγράφηκε. Πατήστε ξανά «Οριστική διαγραφή» για να το ελέγξουμε.';
		expect(deletionFailureMessage('unreachable', 'confirm', 'el')).toBe(words);
		expect(deletionFailureMessage('unknown', 'confirm', 'el')).toBe(words);
		expect(deletionFailureMessage('unreachable', 'confirm', 'en')).toContain('Delete permanently');
	});

	it('the resend’s wait: singular only for one second', () => {
		expect(deletionResendWait(1, 'el')).toBe('Μπορείτε να ζητήσετε νέο κωδικό σε 1 δευτερόλεπτο.');
		expect(deletionResendWait(42, 'el')).toBe(
			'Μπορείτε να ζητήσετε νέο κωδικό σε 42 δευτερόλεπτα.'
		);
		expect(deletionResendWait(42, 'en')).toBe('You can ask for a new code in 42 seconds.');
	});

	it('🔴 U-65.6: the code is digits only, six at most — letters, spaces, signs, markup and a paste too long never stay', () => {
		expect(cleanDeletionCode('482913')).toBe('482913');
		expect(cleanDeletionCode(' 48 29-13 ')).toBe('482913');
		expect(cleanDeletionCode('4a8b2c9d1e3f7')).toBe('482913');
		expect(cleanDeletionCode('<script>1</script>')).toBe('1');
		expect(cleanDeletionCode('１２３４５６')).toBe('');
		expect(cleanDeletionCode('')).toBe('');
		expect(cleanDeletionCode('9'.repeat(4096))).toBe('999999');
	});
});
