import type { DoctorSpecializationOptionsView, DoctorSpecializationsView } from './types';

/**
 * Tests only: `GET /doctor/profile/specializations/options` as the contract writes it — six lines of the cardiologist's
 * list in the catalogue's order, fields a scientific society names (U-122: the server catalogue's own codes and names,
 * none made up).
 */
export function sampleSpecializationOptionsView(): DoctorSpecializationOptionsView {
	return [
		{ code: 'PR011-04', name: 'Αρτηριακή υπέρταση', kind: 'SOCIETY_AREA' },
		{ code: 'PR011-05', name: 'Βαλβιδοπάθειες', kind: 'SOCIETY_AREA' },
		{ code: 'PR011-14', name: 'Αιμοδυναμική και επεμβατική καρδιολογία', kind: 'SOCIETY_AREA' },
		{ code: 'PR011-15', name: 'Ηλεκτροφυσιολογία και βηματοδότηση', kind: 'SOCIETY_AREA' },
		{ code: 'PR011-16', name: 'Ηχωκαρδιολογία', kind: 'SOCIETY_AREA' },
		{ code: 'PR011-17', name: 'Καρδιακή ανεπάρκεια', kind: 'SOCIETY_AREA' }
	];
}

/** Tests only: the prototype's two picks (`sp=full`), both shown at once. */
export function sampleSpecializationsView(): DoctorSpecializationsView {
	return [
		{
			code: 'PR011-15',
			name: 'Ηλεκτροφυσιολογία και βηματοδότηση',
			kind: 'SOCIETY_AREA',
			status: 'APPROVED'
		},
		{ code: 'PR011-17', name: 'Καρδιακή ανεπάρκεια', kind: 'SOCIETY_AREA', status: 'APPROVED' }
	];
}

/** Tests only: three lines of a list of titles of the Government Gazette (U-225), the catalogue's own. */
export function sampleTitleOptionsView(): DoctorSpecializationOptionsView {
	return [
		{ code: 'PR021-01', name: 'Επείγουσα ιατρική', kind: 'FEK_TITLE' },
		{ code: 'PR021-03', name: 'Εντατική θεραπεία', kind: 'FEK_TITLE' },
		{ code: 'PR021-04', name: 'Σακχαρώδης διαβήτης', kind: 'FEK_TITLE' }
	];
}

type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = { method: string; path: string; search: string; body: unknown };

/**
 * Tests only: the API of screen 80 as `w52-b4` writes it, in memory, for a made-up doctor — «Το προφίλ μου», the base
 * profile (the practice licence), the list of the specialty, the picks, and `PUT` of the whole set: more than three,
 * one twice or a code out of shape ⇒ 422; a code that is not of the list ⇒ 422 with the server's marker; a new field of
 * a society is `APPROVED` at once, a new title of the Gazette `PENDING`, a pick the doctor already holds keeps its
 * status; the answer in the list's order. Every call is kept (`calls`); `refuse` plants the answer of the next call of
 * a kind, `hold` keeps the next `PUT` on its way until `release()`. `fetch` is handed to `vi.stubGlobal`.
 */
export function sampleSpecialtyServer(
	start: {
		profile?: () => unknown;
		licence?: () => unknown;
		options?: DoctorSpecializationOptionsView;
		picks?: DoctorSpecializationsView;
	} = {}
) {
	let options = start.options ?? sampleSpecializationOptionsView();
	let picks = start.picks ?? sampleSpecializationsView();
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

	function write(body: unknown): SampleAnswer {
		const codes = (body as { codes?: unknown } | null)?.codes;
		const keys = Object.keys((body ?? {}) as object);
		if (
			!Array.isArray(codes) ||
			keys.length !== 1 ||
			codes.length > 3 ||
			new Set(codes).size !== codes.length ||
			codes.some((code) => typeof code !== 'string' || !/^PR[0-9]{3}-[0-9]{2}$/u.test(code))
		) {
			return refusal(422, 'Validation error: codes must hold at most 3 specializations.');
		}
		if (codes.some((code) => !options.some((line) => line.code === code))) {
			return refusal(422, 'Validation error: DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY');
		}
		picks = options
			.filter((line) => codes.includes(line.code))
			.map((line) => ({
				...line,
				status:
					picks.find((pick) => pick.code === line.code)?.status ??
					(line.kind === 'FEK_TITLE' ? 'PENDING' : 'APPROVED')
			}));
		return { status: 200, data: picks };
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ method, path, search: url.search, body });
		if (method === 'PUT' && holdNext) {
			holdNext = false;
			await new Promise<void>((resolve) => (held = resolve));
		}
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		if (method === 'GET' && path === '/doctor/me/profile' && start.profile) {
			return reply({ status: 200, data: start.profile() });
		}
		if (method === 'GET' && path === '/doctor/profile/base') {
			return reply({
				status: 200,
				data: start.licence
					? start.licence()
					: { licenseNumber: '48213', licenseObtainedDate: '2010-03-12T00:00:00.000Z' }
			});
		}
		if (method === 'GET' && path === '/doctor/profile/specializations/options') {
			return reply({ status: 200, data: options });
		}
		if (method === 'GET' && path === '/doctor/profile/specializations') {
			return reply({ status: 200, data: picks });
		}
		if (method === 'PUT' && path === '/doctor/profile/specializations') return reply(write(body));
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The codes the server keeps now, in the list's order. */
		codes: () => picks.map((pick) => pick.code),
		/** The team answered, or the specialty changed: what the next reads find. */
		set(next: { options?: DoctorSpecializationOptionsView; picks?: DoctorSpecializationsView }) {
			if (next.options) options = next.options;
			if (next.picks) picks = next.picks;
		},
		/** The next call of `method` whose path ends with `ending` is answered with this. */
		refuse(method: string, ending: string, status: number, errorMessage = 'Refused') {
			planted.push({ method, ending, answer: refusal(status, errorMessage) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		},
		/** The next `PUT` stays on its way until `release()`. */
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

export type SampleSpecialtyServer = ReturnType<typeof sampleSpecialtyServer>;
