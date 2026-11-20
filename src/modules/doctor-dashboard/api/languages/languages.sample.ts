import type { DoctorLanguageOptionsView, DoctorLanguagesView } from './types';

type Line = [code: string, iso: string, el: string, en: string];

/** Fifteen lines of the server's own catalogue (`speak-language/{el,en}.json`), in the order of their codes. */
const LINES: readonly Line[] = [
	['SL001', 'el', 'Ελληνικά', 'Greek'],
	['SL002', 'en', 'Αγγλικά', 'English'],
	['SL003', 'de', 'Γερμανικά', 'German'],
	['SL010', 'ar', 'Αραβικά', 'Arabic'],
	['SL017', 'bg', 'Βουλγαρικά', 'Bulgarian'],
	['SL036', 'es', 'Ισπανικά', 'Spanish'],
	['SL044', 'fr', 'Γαλλικά', 'French'],
	['SL050', 'gss', 'Ελληνική Νοηματική Γλώσσα', 'Greek Sign Language'],
	['SL054', 'he', 'Εβραϊκά', 'Hebrew'],
	['SL067', 'it', 'Ιταλικά', 'Italian'],
	['SL125', 'ro', 'Ρουμανικά', 'Romanian'],
	['SL126', 'ru', 'Ρωσικά', 'Russian'],
	['SL138', 'sq', 'Αλβανικά', 'Albanian'],
	['SL154', 'tr', 'Τουρκικά', 'Turkish'],
	['SL159', 'uk', 'Ουκρανικά', 'Ukrainian']
];

/** The server's own `normalized`: the name in lower case, without accents. */
const normalized = (name: string) => name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Tests only: `GET /doctor/public/speak-languages/options` as the contract writes it — lines of the server's own
 * catalogue (never a made-up language), named in `lang`, in the order of their codes.
 */
export function sampleLanguageOptionsView(lang: 'el' | 'en' = 'el'): DoctorLanguageOptionsView {
	return LINES.map(([code, iso, el, en]) => {
		const name = lang === 'en' ? en : el;
		return {
			code,
			iso,
			name,
			normalized: normalized(name),
			slug: normalized(en).replace(/ /gu, '-')
		};
	});
}

/** Tests only: the rows of the doctor's languages as the contract writes them, Greek first and then by name. */
export function sampleLanguagesView(
	codes: readonly string[] = ['SL001', 'SL002'],
	lang: 'el' | 'en' = 'el'
): DoctorLanguagesView {
	const collator = new Intl.Collator(lang);
	return sampleLanguageOptionsView(lang)
		.filter((line) => codes.includes(line.code))
		.sort(
			(one, other) =>
				Number(other.code === 'SL001') - Number(one.code === 'SL001') ||
				collator.compare(one.name, other.name)
		)
		.map(({ code, name, normalized: folded, slug }, index) => ({
			id: `5f0c1c1e-0000-4000-8000-00000000000${index}`,
			doctorId: '5f0c1c1e-1111-4111-8111-111111111111',
			code,
			name,
			normalized: folded,
			slug,
			createdAt: '2026-11-18T10:00:00.000Z',
			updatedAt: '2026-11-18T10:00:00.000Z'
		}));
}

type SampleLinks = Record<'website' | 'facebook' | 'instagram' | 'linkedin', string | null>;

/** Tests only: the prototype's two links (`ls=full`). */
export function sampleLinks(): SampleLinks {
	return {
		website: 'https://www.example.gr',
		facebook: null,
		instagram: null,
		linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
	};
}

type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = {
	method: string;
	path: string;
	search: string;
	body: unknown;
	credentials: RequestCredentials | undefined;
	cache: RequestCache | undefined;
};

/**
 * Tests only: the API of screen 82 as `w52-b6` writes it, in memory, for a made-up doctor — the catalogue of languages
 * (in the language asked), the doctor's languages, `PUT` of the whole set (more than ten, one twice, a code out of
 * shape or any other field ⇒ 422; a code the catalogue does not hold ⇒ 422 with the server's marker; the answer Greek
 * first and then by name), the base profile (the four links among fields this screen never keeps) and `PATCH` of it
 * (the fields sent are stored as sent), and — given `profile` — «Το προφίλ μου» (`GET /doctor/me/profile`). Every call
 * is kept (`calls`); `refuse` plants the answer of the next call of a kind, `hold` keeps the next write on its way until
 * `release()`. `fetch` is handed to `vi.stubGlobal`.
 */
export function sampleLanguagesServer(
	start: {
		codes?: readonly string[];
		links?: Partial<SampleLinks>;
		profile?: () => unknown;
	} = {}
) {
	let codes = [...(start.codes ?? ['SL001', 'SL002'])];
	let links: SampleLinks = { ...sampleLinks(), ...start.links };
	let lost: string[] = [];
	const calls: SampleCall[] = [];
	const planted: { method: string; ending: string; answer: SampleAnswer }[] = [];
	let held: (() => void) | null = null;
	let holdNext = false;

	const reply = ({ status, data, body }: SampleAnswer) =>
		new Response(
			JSON.stringify(
				body ?? { status: status < 400 ? 'success' : 'error', message: '', data: data ?? null }
			),
			{ status }
		);
	const refusal = (status: number, errorMessage: string): SampleAnswer => ({
		status,
		body: { errorCode: `EC${status}`, errorMessage }
	});
	const langOf = (search: string): 'el' | 'en' =>
		new URLSearchParams(search).get('lang') === 'en' ? 'en' : 'el';
	const catalogue = (lang: 'el' | 'en') =>
		sampleLanguageOptionsView(lang).filter((line) => !lost.includes(line.code));
	const base = () => ({
		doctorId: '5f0c1c1e-1111-4111-8111-111111111111',
		notificationEmailMasked: 'd•••@seed.edoctor.test',
		notificationEmailVerifiedAt: null,
		licenseNumber: '48213',
		licenseObtainedDate: '2010-03-12T00:00:00.000Z',
		appointmentsEnabled: true,
		appointmentConfirmationMode: 'MANUAL',
		cancellationCutoffHours: 24,
		minBookingNoticeHours: 2,
		maxBookingHorizonDays: 60,
		updatedAt: '2026-11-18T10:00:00.000Z',
		...links
	});

	function replace(body: unknown, lang: 'el' | 'en'): SampleAnswer {
		const sent = (body as { codes?: unknown } | null)?.codes;
		const keys = Object.keys((body ?? {}) as object);
		if (
			!Array.isArray(sent) ||
			keys.length !== 1 ||
			sent.length > 10 ||
			new Set(sent).size !== sent.length ||
			sent.some((code) => typeof code !== 'string' || !/^SL\d{3}$/.test(code))
		) {
			return refusal(422, 'Validation error: codes must hold at most 10 languages.');
		}
		if (sent.some((code) => !catalogue('el').some((line) => line.code === code))) {
			return refusal(422, 'Validation error: DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE');
		}
		codes = [...sent];
		return { status: 200, data: sampleLanguagesView(codes, lang) };
	}

	function patch(body: unknown): SampleAnswer {
		const sent = (body ?? {}) as Record<string, unknown>;
		links = {
			website: 'website' in sent ? (sent.website as string | null) : links.website,
			facebook: 'facebook' in sent ? (sent.facebook as string | null) : links.facebook,
			instagram: 'instagram' in sent ? (sent.instagram as string | null) : links.instagram,
			linkedin: 'linkedin' in sent ? (sent.linkedin as string | null) : links.linkedin
		};
		return { status: 200, data: base() };
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({
			method,
			path,
			search: url.search,
			body,
			credentials: init?.credentials,
			cache: init?.cache
		});
		if (method !== 'GET' && holdNext) {
			holdNext = false;
			await new Promise<void>((resolve) => (held = resolve));
		}
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		const lang = langOf(url.search);
		if (method === 'GET' && path === '/doctor/me/profile' && start.profile) {
			return reply({ status: 200, data: start.profile() });
		}
		if (method === 'GET' && path === '/doctor/public/speak-languages/options') {
			return reply({ status: 200, data: catalogue(lang) });
		}
		if (method === 'GET' && path === '/doctor/profile/speak-languages') {
			return reply({ status: 200, data: sampleLanguagesView(codes, lang) });
		}
		if (method === 'PUT' && path === '/doctor/profile/speak-languages') {
			return reply(replace(body, lang));
		}
		if (method === 'GET' && path === '/doctor/profile/base') {
			return reply({ status: 200, data: base() });
		}
		if (method === 'PATCH' && path === '/doctor/profile/base') return reply(patch(body));
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The codes the server keeps now, as they were sent. */
		codes: () => [...codes],
		/** The links the server keeps now. */
		links: () => ({ ...links }),
		/** Another tab saved, or the catalogue lost a line: what the next reads find. */
		set(next: { codes?: readonly string[]; links?: Partial<SampleLinks>; lost?: string[] }) {
			if (next.codes) codes = [...next.codes];
			if (next.links) links = { ...links, ...next.links };
			if (next.lost) lost = next.lost;
		},
		/** The next call of `method` whose path ends with `ending` is answered with this. */
		refuse(method: string, ending: string, status: number, errorMessage = 'Refused') {
			planted.push({ method, ending, answer: refusal(status, errorMessage) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		},
		/** The next write stays on its way until `release()`. */
		hold() {
			holdNext = true;
		},
		release() {
			held?.();
			held = null;
		},
		callsOf: (method: string, ending = '') =>
			calls.filter((call) => call.method === method && call.path.endsWith(ending))
	};
}

export type SampleLanguagesServer = ReturnType<typeof sampleLanguagesServer>;
