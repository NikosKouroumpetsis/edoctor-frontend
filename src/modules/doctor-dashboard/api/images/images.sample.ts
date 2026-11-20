import type { DoctorProfileImageView } from './types';

/** A made-up doctor id and made-up photo ids (no person's): the samples' and the specs'. */
export const SAMPLE_PHOTO_DOCTOR_ID = '0199a0d0-0000-7000-8000-0000000000d1';
export const SAMPLE_PHOTO_IDS = [
	'0199a0d0-0000-7000-8000-0000000000a1',
	'0199a0d0-0000-7000-8000-0000000000a2',
	'0199a0d0-0000-7000-8000-0000000000a3',
	'0199a0d0-0000-7000-8000-0000000000a4'
] as const;

/**
 * Tests only: one image as the contract writes it (`DoctorImageViewExt`), of a made-up doctor — `position` from 1, the
 * server's own words for it (D-W52-33). Patch what a case changes.
 */
export function samplePhotoView(
	position: number,
	patch: Partial<DoctorProfileImageView> = {}
): DoctorProfileImageView {
	const id =
		SAMPLE_PHOTO_IDS[position - 1] ??
		`0199a0d0-0000-7000-8000-${String(position).padStart(12, '0')}`;
	return {
		id,
		doctorId: SAMPLE_PHOTO_DOCTOR_ID,
		smSizeUrl: `/uploads/doctor/profile/images/small/${position}.webp`,
		mediumSizeUrl: `/uploads/doctor/profile/images/medium/${position}.webp`,
		lgSizeUrl: `/uploads/doctor/profile/images/large/${position}.webp`,
		priority: position - 1,
		createdAt: '2026-11-18T14:00:00.000Z',
		updatedAt: '2026-11-18T14:00:00.000Z',
		translations: [
			{
				id: `${id}-el`,
				language: 'el',
				alt: `Ελένη Παππά, φωτογραφία ${position}`,
				metaDescription: null
			},
			{
				id: `${id}-en`,
				language: 'en',
				alt: `Eleni Pappa, photo ${position}`,
				metaDescription: null
			}
		],
		...patch
	};
}

/** Tests only: the first `count` photos of the made-up doctor, in the server's order. */
export function samplePhotoViews(count = 4): DoctorProfileImageView[] {
	return Array.from({ length: count }, (_, index) => samplePhotoView(index + 1));
}

type SampleCall = { method: string; path: string; body: unknown };
type SampleRefusal = { status: number; body?: unknown };

/** Tests only: a write of a file on its way (`XMLHttpRequest`), answered by the spec when it chooses. */
export type SamplePhotoUpload = {
	method: string;
	path: string;
	body: { image?: { file?: string; fileName?: string } } & Record<string, unknown>;
	done: boolean;
	progress: (loaded: number, total: number) => void;
	/** The server stores the file: a new photo last in the order (`POST`), or new addresses in its place (`PATCH`). */
	store: () => void;
	refuse: (status: number, body?: unknown) => void;
	lose: () => void;
};

/**
 * Tests only: the API of the photos as `w52-b2` writes it, in memory, for a made-up doctor — the list in its order,
 * `PUT order` (positions and the words of each position rewritten), `DELETE`, and the two writes of a file, which stay
 * on their way until the spec answers them. Every call is kept (`calls`); `refuse` plants the answer of the next call
 * of a kind. `fetch` and `Upload` are handed to `vi.stubGlobal`.
 */
export function samplePhotoServer(
	options: { count?: number; profile?: () => unknown; text?: () => unknown } = {}
) {
	let images = samplePhotoViews(options.count ?? 4);
	let made = images.length;
	const calls: SampleCall[] = [];
	const uploads: SamplePhotoUpload[] = [];
	const refusals: { method: string; ending: string; refusal: SampleRefusal }[] = [];

	const pathOf = (address: string) => new URL(address).pathname.replace(/^.*\/api\/v1/u, '');
	const renumber = () => {
		images = images.map((image, index) =>
			samplePhotoView(index + 1, {
				id: image.id,
				smSizeUrl: image.smSizeUrl,
				mediumSizeUrl: image.mediumSizeUrl,
				lgSizeUrl: image.lgSizeUrl
			})
		);
	};
	const planted = (method: string, path: string): SampleRefusal | null => {
		const index = refusals.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		return index < 0 ? null : refusals.splice(index, 1)[0].refusal;
	};
	const refusalBody = (refusal: SampleRefusal) =>
		refusal.body ?? { errorCode: `EC${refusal.status}`, errorMessage: 'Refused' };
	const envelope = (data: unknown) => ({ status: 'success', message: '', data });

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const method = init?.method ?? 'GET';
		const path = pathOf(input instanceof Request ? input.url : String(input));
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		calls.push({ method, path, body });
		const refusal = planted(method, path);
		if (refusal)
			return new Response(JSON.stringify(refusalBody(refusal)), { status: refusal.status });
		const answer = (data: unknown) => new Response(JSON.stringify(envelope(data)), { status: 200 });
		if (method === 'GET' && path === '/doctor/profile/images') return answer(images);
		if (method === 'GET' && path === '/doctor/me/profile' && options.profile) {
			return answer(options.profile());
		}
		// Screen 79: the Greek text of the page (`null` is an answer too: no text in that language).
		if (method === 'GET' && path === '/doctor/profile/translations/el' && options.text) {
			return answer(options.text());
		}
		if (method === 'PUT' && path === '/doctor/profile/images/order') {
			const ids = (body as { imageIds: string[] }).imageIds;
			images = ids.flatMap((id) => images.find((image) => image.id === id) ?? []);
			renumber();
			return answer(images);
		}
		if (method === 'DELETE' && path.startsWith('/doctor/profile/images/')) {
			const id = path.split('/').pop();
			const gone = images.find((image) => image.id === id);
			images = images.filter((image) => image.id !== id);
			renumber();
			return answer(gone ?? null);
		}
		return new Response(
			JSON.stringify({ errorCode: 'EC404', errorMessage: 'Resource not found' }),
			{
				status: 404
			}
		);
	}

	class Upload {
		method = '';
		path = '';
		withCredentials = false;
		responseType = '';
		status = 0;
		responseText = '';
		upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		onabort: (() => void) | null = null;
		ontimeout: (() => void) | null = null;

		open(method: string, address: string) {
			this.method = method;
			this.path = pathOf(address);
		}
		setRequestHeader() {}
		abort() {
			this.onabort?.();
		}
		send(text: string) {
			const body = JSON.parse(text) as SamplePhotoUpload['body'];
			calls.push({ method: this.method, path: this.path, body });
			const finish = (status: number, answer: unknown) => {
				entry.done = true;
				this.status = status;
				this.responseText = JSON.stringify(answer);
				this.onload?.();
			};
			const entry: SamplePhotoUpload = {
				method: this.method,
				path: this.path,
				body,
				done: false,
				progress: (loaded, total) =>
					this.upload.onprogress?.({ loaded, total, lengthComputable: true } as ProgressEvent),
				store: () => {
					if (this.method === 'POST') {
						made += 1;
						const stored = samplePhotoView(images.length + 1, {
							id: `0199a0d0-0000-7000-8000-0000000001${String(made).padStart(2, '0')}`,
							mediumSizeUrl: `/uploads/doctor/profile/images/medium/new-${made}.webp`,
							lgSizeUrl: `/uploads/doctor/profile/images/large/new-${made}.webp`
						});
						images = [...images, stored];
						finish(201, envelope(stored));
						return;
					}
					const id = this.path.split('/').pop();
					made += 1;
					images = images.map((image) =>
						image.id === id
							? {
									...image,
									mediumSizeUrl: `/uploads/doctor/profile/images/medium/cut-${made}.webp`,
									lgSizeUrl: `/uploads/doctor/profile/images/large/cut-${made}.webp`
								}
							: image
					);
					finish(200, envelope(images.find((image) => image.id === id) ?? null));
				},
				refuse: (status, answer) => finish(status, refusalBody({ status, body: answer })),
				lose: () => {
					entry.done = true;
					this.onerror?.();
				}
			};
			uploads.push(entry);
		}
	}

	return {
		fetch: fetchStub,
		Upload,
		calls,
		uploads,
		/** The ids in the server's order now. */
		ids: () => images.map((image) => image.id),
		/** The next call of `method` whose path ends with `ending` is answered with this refusal. */
		refuse(method: string, ending: string, status: number, body?: unknown) {
			refusals.push({ method, ending, refusal: { status, body } });
		},
		/** The calls of one kind, as `[path, body]`. */
		callsOf: (method: string) =>
			calls.filter((call) => call.method === method).map((call) => [call.path, call.body]),
		/** The write of a file that is on its way now (the last one not answered yet). */
		sending: () => uploads.filter((upload) => !upload.done).at(-1) ?? null
	};
}

export type SamplePhotoServer = ReturnType<typeof samplePhotoServer>;
