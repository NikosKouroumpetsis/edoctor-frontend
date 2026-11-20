import type { DoctorAllowedServicesView, DoctorServicesView } from './types';

/** One service as the wire writes it: the fields the page reads (U-209.3: never the expertise flag of before D-W52-56). */
export type SampleServiceRow = Pick<
	DoctorServicesView[number],
	| 'id'
	| 'doctorId'
	| 'serviceId'
	| 'title'
	| 'price'
	| 'amount'
	| 'customDurationInMinutes'
	| 'yearsOfexperience'
	| 'catalogueId'
	| 'translations'
>;
type SampleRow = SampleServiceRow;
type SampleOption = DoctorAllowedServicesView[number];
type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = { method: string; path: string; search: string; body: unknown };

const DOCTOR_ID = '0199a0d0-0000-7000-8000-0000000000d1';
/** Tests only: server ids of the made-up services of the doctor, `…5001`, `…5002`, … */
export const sampleDoctorServiceId = (index: number) =>
	`0193d000-0000-7000-8000-00000000${String(5000 + index)}`;
/** Tests only: the catalogue's ids, `…9001`, `…9002`, … */
export const sampleCatalogueServiceId = (index: number) =>
	`0193d000-0000-7000-8000-00000000${String(9000 + index)}`;

/** The prototype's cardiology catalogue (`sw.js` `US_CAT`): [index, title, usual length, subtitle, description]. */
const CATALOGUE: [number, string, number, string | null, string | null][] = [
	[
		1,
		'Απλή επίσκεψη',
		30,
		'Εξέταση και συζήτηση για ό,τι σας απασχολεί',
		'Μια πρώτη ή τακτική επίσκεψη στο ιατρείο.'
	],
	[
		2,
		'Επανεξέταση',
		20,
		'Για αποτελέσματα εξετάσεων ή την πορεία της θεραπείας',
		'Σύντομη επίσκεψη μετά από προηγούμενο ραντεβού.'
	],
	[
		3,
		'Ηλεκτροκαρδιογράφημα',
		20,
		'Καταγραφή του ρυθμού της καρδιάς σε λίγα λεπτά',
		'Ανώδυνη εξέταση με ηλεκτρόδια.'
	],
	[
		4,
		'Υπέρηχος καρδιάς',
		30,
		'Εικόνα της καρδιάς και των βαλβίδων με υπέρηχο',
		'Ανώδυνη εξέταση χωρίς ακτινοβολία.'
	],
	[
		5,
		'Holter ρυθμού 24ώρου',
		20,
		'Καταγραφή του ρυθμού για ένα 24ωρο',
		'Μια μικρή συσκευή που φοράτε για 24 ώρες.'
	],
	[6, 'Τεστ κοπώσεως', 60, 'Η καρδιά σε κίνηση, στον διάδρομο', null],
	[7, 'Βεβαίωση υγείας', 30, null, null]
];

const titleOf = (serviceIndex: number) =>
	CATALOGUE.find(([index]) => index === serviceIndex)?.[1] ?? '';

function row(
	index: number,
	serviceIndex: number,
	price: number,
	minutes: number,
	texts: { subtitle?: string | null; description?: string | null } = {},
	years: number | null = null
): SampleRow {
	return {
		id: sampleDoctorServiceId(index),
		doctorId: DOCTOR_ID,
		serviceId: sampleCatalogueServiceId(serviceIndex),
		title: titleOf(serviceIndex),
		price,
		amount: null,
		customDurationInMinutes: minutes,
		yearsOfexperience: years,
		catalogueId: '0193d000-0000-7000-8000-00000000c0de',
		translations: [
			{
				id: `0193d000-0000-7000-8000-0000000${String(70000 + index)}`,
				language: 'el',
				subtitle: texts.subtitle ?? null,
				description: texts.description ?? null
			}
		]
	};
}

/**
 * Tests only: `GET /doctor-service/doctor-services` as the contract writes it — the prototype's four services (`sw.js`
 * `US`) in the doctor's order: «Απλή επίσκεψη» with the doctor's own description and 15 years, «Επανεξέταση» with both
 * texts, «Ηλεκτροκαρδιογράφημα» and «Υπέρηχος καρδιάς» with none (U-214: blank is the doctor's choice).
 */
export function sampleServicesView(): SampleServiceRow[] {
	return [
		row(1, 1, 60, 30, { description: 'Λήψη ιστορικού και κλινική εξέταση.' }, 15),
		row(2, 2, 45, 20, {
			subtitle: 'Για όσους έχουν ήδη έρθει',
			description: 'Έλεγχος της πορείας και των εξετάσεων.'
		}),
		row(3, 3, 30, 20),
		row(4, 4, 80, 90, {}, 12)
	];
}

/** Tests only: the doctor's ONE service (the last one, D-W52-74). */
export function sampleOneServiceView(): SampleServiceRow[] {
	return [row(1, 1, 60, 30)];
}

/**
 * Tests only: the API of screen 83 as `w52-b7` writes it, in memory, for a made-up cardiologist — the list in the
 * doctor's order, the catalogue with `owned`, `POST` (price 1–9999 whole, a length of the list, Greek alone, 409 for a
 * service already offered), `PATCH`, `DELETE` (409 `DOCTOR_SERVICE_LAST_ONE` for the last), `PUT …/order` (404 for an
 * id of no service of the doctor, 422 `DOCTOR_SERVICE_ORDER_MISMATCH` for a missing one), the practice licence
 * (`GET /doctor/profile/base`) and `GET /doctor/me/profile`. Every call is kept; `refuse` / `plant` set the answer of
 * the next call of a kind, `hold` keeps the next write on its way until `release()`.
 */
export function sampleServicesServer(
	start: {
		rows?: SampleServiceRow[];
		licenseObtainedDate?: string | null;
		profile?: () => unknown;
	} = {}
) {
	let rows: SampleRow[] = [...(start.rows ?? sampleServicesView())];
	const calls: SampleCall[] = [];
	const planted: { method: string; ending: string; answer: SampleAnswer }[] = [];
	let held: (() => void) | null = null;
	let holdNext = false;
	let minted = 50;

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
	const invalid = (why: string) => refusal(422, `Validation Error: ${why}`);
	const LENGTHS = [15, 20, 30, 45, 60, 75, 90, 105, 120];
	const priceOk = (price: unknown) =>
		typeof price === 'number' && Number.isInteger(price) && price >= 1 && price <= 9999;

	const options = (): SampleOption[] =>
		CATALOGUE.map(([index, title, minutes, subtitle, description]) => ({
			id: sampleCatalogueServiceId(index),
			title,
			suggestedSubtitle: subtitle,
			suggestedDescription: description,
			durationInMinutes: minutes,
			owned: rows.some((entry) => entry.serviceId === sampleCatalogueServiceId(index))
		}));

	function texts(body: {
		translations?: unknown;
	}): SampleAnswer | NonNullable<SampleRow['translations']> {
		const list = body.translations;
		if (!Array.isArray(list) || list.length < 1) return invalid('translations');
		if (list.some((text: { language?: string }) => text.language !== 'el'))
			return invalid('DOCTOR_WRITES_GREEK_ONLY');
		const [{ subtitle = null, description = null }] = list;
		if (typeof subtitle === 'string' && subtitle.length > 120) return invalid('subtitle');
		if (typeof description === 'string' && description.length > 1000) return invalid('description');
		return [
			{
				id: '0193d000-0000-7000-8000-000000071000',
				language: 'el',
				subtitle: subtitle?.trim() || null,
				description: description?.trim() || null
			}
		];
	}

	function create(body: Record<string, unknown>): SampleAnswer {
		const known = [
			'doctorId',
			'serviceId',
			'price',
			'customDurationInMinutes',
			'yearsOfexperience',
			'translations'
		];
		if (Object.keys(body).some((key) => !known.includes(key))) return invalid('unknown field');
		if (body.doctorId !== DOCTOR_ID) return refusal(403, 'Forbidden');
		const option = options().find((entry) => entry.id === body.serviceId);
		if (!option) return invalid('service is not allowed');
		if (!priceOk(body.price) || !LENGTHS.includes(body.customDurationInMinutes as number))
			return refusal(422, 'Validation failed fields: must be <= 9999');
		if (option.owned)
			return refusal(409, 'Already exist: doctor service already exists in catalogue.');
		const translations = texts(body);
		if (!Array.isArray(translations)) return translations;
		minted += 1;
		const index = CATALOGUE.find(([, title]) => title === option.title)?.[0] ?? 1;
		const made = {
			...row(minted, index, body.price as number, body.customDurationInMinutes as number),
			yearsOfexperience: (body.yearsOfexperience as number | undefined) ?? null,
			translations
		};
		rows = [...rows, made];
		return { status: 201, data: made };
	}

	function update(id: string, body: Record<string, unknown>): SampleAnswer {
		const at = rows.findIndex((entry) => entry.id === id);
		if (at < 0) return refusal(403, 'Forbidden: doctor service is not accessible to this account.');
		const known = ['price', 'customDurationInMinutes', 'yearsOfexperience', 'translations'];
		if (Object.keys(body).length === 0 || Object.keys(body).some((key) => !known.includes(key)))
			return invalid('unknown field');
		if ('price' in body && !priceOk(body.price))
			return refusal(422, 'Validation failed fields: must be <= 9999');
		if (
			'customDurationInMinutes' in body &&
			!LENGTHS.includes(body.customDurationInMinutes as number)
		)
			return refusal(422, 'Validation failed fields: must be equal to one of the allowed values');
		const translations = 'translations' in body ? texts(body) : (rows[at].translations ?? []);
		if (!Array.isArray(translations)) return translations;
		const next = {
			...rows[at],
			...('price' in body ? { price: body.price as number } : {}),
			...('customDurationInMinutes' in body
				? { customDurationInMinutes: body.customDurationInMinutes as number }
				: {}),
			...('yearsOfexperience' in body
				? { yearsOfexperience: body.yearsOfexperience as number | null }
				: {}),
			translations
		};
		rows = rows.map((entry, index) => (index === at ? next : entry));
		return { status: 200, data: next };
	}

	function remove(id: string): SampleAnswer {
		const found = rows.find((entry) => entry.id === id);
		if (!found) return refusal(403, 'Forbidden: doctor service is not accessible to this account.');
		if (rows.length <= 1) return refusal(409, 'Already exist: DOCTOR_SERVICE_LAST_ONE');
		rows = rows.filter((entry) => entry.id !== id);
		return { status: 200, data: found };
	}

	function order(body: { ids?: unknown }): SampleAnswer {
		const ids = body?.ids;
		if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length)
			return invalid('ids');
		if (ids.some((id) => !rows.some((entry) => entry.id === id)))
			return refusal(404, 'Resource not found');
		if (ids.length !== rows.length) return invalid('DOCTOR_SERVICE_ORDER_MISMATCH');
		rows = ids.map((id) => rows.find((entry) => entry.id === id) as SampleRow);
		return { status: 200, data: rows };
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ method, path, search: url.search, body });
		if (method !== 'GET' && holdNext) {
			holdNext = false;
			await new Promise<void>((resolve) => (held = resolve));
		}
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		const SERVICES = '/doctor-service/doctor-services';
		if (method === 'GET' && path === '/doctor/me/profile' && start.profile) {
			return reply({ status: 200, data: start.profile() });
		}
		if (method === 'GET' && path === '/doctor/profile/base') {
			return reply({
				status: 200,
				data: {
					licenseNumber: '48213',
					licenseObtainedDate:
						start.licenseObtainedDate === undefined
							? '2010-03-12T00:00:00.000Z'
							: start.licenseObtainedDate
				}
			});
		}
		if (method === 'GET' && path === '/doctor-service/allowed-services') {
			return reply({ status: 200, data: options() });
		}
		if (method === 'GET' && path === SERVICES) return reply({ status: 200, data: rows });
		if (method === 'POST' && path === SERVICES) return reply(create(body ?? {}));
		if (method === 'PUT' && path === `${SERVICES}/order`) return reply(order(body ?? {}));
		if (path.startsWith(`${SERVICES}/`)) {
			const id = decodeURIComponent(path.slice(SERVICES.length + 1));
			if (method === 'PATCH') return reply(update(id, body ?? {}));
			if (method === 'DELETE') return reply(remove(id));
		}
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The titles the server keeps now, in the doctor's order. */
		titles: () => rows.map((entry) => entry.title),
		rows: () => rows,
		set(next: SampleServiceRow[]) {
			rows = [...next];
		},
		refuse(method: string, ending: string, status: number, errorMessage = 'Refused') {
			planted.push({ method, ending, answer: refusal(status, errorMessage) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		},
		hold() {
			holdNext = true;
		},
		release() {
			held?.();
			held = null;
		},
		/** The writes (every call but a read). */
		writes: () => calls.filter((call) => call.method !== 'GET'),
		callsOf: (method: string, ending = '') =>
			calls.filter((call) => call.method === method && call.path.endsWith(ending))
	};
}

export type SampleServicesServer = ReturnType<typeof sampleServicesServer>;
