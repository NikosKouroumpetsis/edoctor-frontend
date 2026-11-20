import { onDestroy, untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { ApiError } from '$shared/lib/http';
import { checkImageFile, readAsDataUri } from '$shared/lib/image';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { move } from '$shared/ui/organisms/image-uploader/lib/reorder';
import { m } from '$paraglide/messages.js';
import {
	doctorProfileImagesQuery,
	readDoctorPhotoFailure,
	reorderDoctorProfileImages,
	uploadDoctorProfileImage,
	type DoctorProfileImageFacts
} from '$modules/doctor-dashboard/api/images';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_PHOTO_FILE_RULES,
	doctorPhotoIssueOf,
	doctorPhotoIssueOfFile,
	doctorPhotoIssueText,
	doctorPhotoRoom,
	sameDoctorPhotoOrder
} from '$modules/doctor-dashboard/lib/photos';
import type { DoctorPhotoRejection, DoctorPhotosView, DoctorPhotoUpload } from '../types';

// A file's name is the person's own text: shown as text, and no longer than a line can hold.
const MAX_NAME = 80;

/**
 * Wave 5.2 · screen 78 «Φωτογραφίες» (U-206, D-W52-36 … 39): the page's read — the photos of the session's own doctor in
 * the server's order — and its three writes.
 * - 🔴 D-W52-38 **Ανέβασμα**: each picked file is checked on the device (type, 10 MB, 800 × 600) and the ones that pass
 *   are sent ONE at a time, each telling how much of it has left; a failed one stays as «Δεν ανέβηκε» until it is sent
 *   again or taken away. Never more than fit under the 20 (D-W52-29); the server's own refusals read as the same reasons.
 * - 🔴 D-W52-39 **Σειρά**: the new order shows at once and goes in ONE call (`PUT order`); presses that come while a call
 *   is away become the next call (the last order wanted, once). A refusal puts the photos back and says so.
 * - Every write that ends reads «Το προφίλ μου» again with the photos (the profile's root): the row of screen 77 follows.
 * A session the server no longer knows (`401`) ends here.
 */
export function useDoctorPhotos(options: {
	locale: () => SupportedLocale;
	/** The device's own check and read of a file (the shared ones; a spec hands in its own). */
	check?: typeof checkImageFile;
	read?: typeof readAsDataUri;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const check = options.check ?? checkImageFile;
	const readFile = options.read ?? readAsDataUri;
	const key = doctorDashboardQueryKeys.profileImages();
	const messages = () => ({ locale: options.locale() });

	const list = createQuery(() => ({ ...doctorProfileImagesQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: list.data, isError: list.isError, error: list.error });
	const view = $derived.by((): DoctorPhotosView => {
		if (answer.data !== undefined) return 'ready';
		return answer.isError ? 'failed' : 'loading';
	});
	const images = $derived(answer.data ?? []);

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (error === ended || !(error instanceof ApiError) || error.status !== 401) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const stored = () => client.getQueryData<DoctorProfileImageFacts[]>(key) ?? [];
	/** 🔴 D-W52-41: a write ended — the photos and «Το προφίλ μου» (the row of 77, the preview) are read again. */
	const refresh = () =>
		void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });

	// ── Ανέβασμα ────────────────────────────────────────────────────────────────────────────────────────────────────
	let uploads = $state<DoctorPhotoUpload[]>([]);
	let rejected = $state<DoctorPhotoRejection[]>([]);
	let full = $state(false);
	// The picked files themselves, by their tile's id: never in rune state (a `File` is no fact to watch).
	const files: Record<number, File | undefined> = {};
	let nextId = 0;
	let pumping = false;
	// The page was left: the photo on its way ends as it ends, nothing that waited is sent after it.
	let left = false;

	const patch = (id: number, change: Partial<DoctorPhotoUpload>) => {
		uploads = uploads.map((upload) => (upload.id === id ? { ...upload, ...change } : upload));
	};
	const forget = (id: number) => {
		const upload = uploads.find((entry) => entry.id === id);
		if (upload?.preview) URL.revokeObjectURL?.(upload.preview);
		delete files[id];
		uploads = uploads.filter((entry) => entry.id !== id);
	};

	const send = createMutation<DoctorProfileImageFacts | null, unknown, number>(() => ({
		networkMode: 'always' as const,
		mutationFn: async (id: number) => {
			const file = files[id];
			if (!file) throw new Error('The picked file is gone');
			return uploadDoctorProfileImage(await readFile(file), {
				onProgress: (fraction) => patch(id, { progress: fraction })
			});
		}
	}));

	/** 🔴 D-W52-38: the queue, ONE file at a time, in the order they were picked. */
	async function pump() {
		if (pumping) return;
		pumping = true;
		try {
			for (;;) {
				const next = left ? undefined : uploads.find((upload) => upload.status === 'waiting');
				if (!next) break;
				patch(next.id, { status: 'sending', progress: 0, issue: null });
				try {
					const image = await send.mutateAsync(next.id);
					forget(next.id);
					if (image) {
						client.setQueryData<DoctorProfileImageFacts[]>(key, (old) =>
							old && !old.some((entry) => entry.id === image.id) ? [...old, image] : old
						);
					}
					refresh();
				} catch (error) {
					const failure = readDoctorPhotoFailure(error);
					if (failure === 'limit') {
						// 🔴 D-W52-29: nothing more fits — this one and those still waiting leave, and the page says why.
						for (const upload of uploads) {
							if (upload.id === next.id || upload.status === 'waiting') forget(upload.id);
						}
						full = true;
						refresh();
						break;
					}
					patch(next.id, { status: 'failed', issue: doctorPhotoIssueOf(failure) });
					if (failure === 'session') {
						// The session ended under the page: nothing more is sent until the person is back.
						for (const upload of uploads) {
							if (upload.status === 'waiting')
								patch(upload.id, { status: 'failed', issue: 'failed' });
						}
						session?.expire({});
						break;
					}
				}
			}
		} finally {
			pumping = false;
		}
	}

	/**
	 * 🔴 D-W52-38 · D-W52-29: the picked files — each checked on the device first; the ones that pass join the queue
	 * while there is room under the 20, the rest are named with their reason («Έως 20 φωτογραφίες.» for those over).
	 */
	async function add(picked: readonly File[]) {
		rejected = [];
		full = false;
		let room = doctorPhotoRoom(stored().length, uploads.length);
		const locale = options.locale();
		for (const file of picked) {
			const issue = await check(file, DOCTOR_PHOTO_FILE_RULES);
			if (issue) {
				rejected = [
					...rejected,
					{
						id: ++nextId,
						name: file.name.slice(0, MAX_NAME),
						text: doctorPhotoIssueText(doctorPhotoIssueOfFile(issue), locale) ?? ''
					}
				];
				continue;
			}
			if (room <= 0) {
				full = true;
				continue;
			}
			room -= 1;
			const id = ++nextId;
			files[id] = file;
			uploads = [
				...uploads,
				{
					id,
					preview: URL.createObjectURL?.(file) ?? '',
					status: 'waiting',
					progress: 0,
					issue: null
				}
			];
			void pump();
		}
	}

	onDestroy(() => {
		left = true;
		for (const upload of uploads) if (upload.preview) URL.revokeObjectURL?.(upload.preview);
		for (const id of Object.keys(files)) delete files[Number(id)];
	});

	// ── Σειρά ───────────────────────────────────────────────────────────────────────────────────────────────────────
	let announcement = $state('');
	let orderFailure = $state<string | null>(null);
	// The photos as the server last kept them (the way back of a refusal), and the order wanted while a call is away.
	let kept: DoctorProfileImageFacts[] | null = null;
	let wanted: string[] | null = null;
	let ordering = false;

	const write = createMutation<DoctorProfileImageFacts[] | null, unknown, string[]>(() => ({
		networkMode: 'always' as const,
		mutationFn: (ids: string[]) => reorderDoctorProfileImages(ids)
	}));

	/** 🔴 D-W52-39: the order shows at once; one call carries it, and the last order wanted while it was away, once. */
	async function reorder(ids: string[]) {
		const before = stored();
		if (
			sameDoctorPhotoOrder(
				ids,
				before.map((image) => image.id)
			)
		)
			return;
		const next = ids.flatMap((id) => before.find((image) => image.id === id) ?? []);
		if (next.length !== before.length) return;
		orderFailure = null;
		// A read that is on its way must not put the old order back over this one.
		void client.cancelQueries({ queryKey: key });
		client.setQueryData<DoctorProfileImageFacts[]>(key, next);
		wanted = ids;
		if (ordering) return;
		ordering = true;
		kept = before;
		try {
			while (wanted) {
				const sending: string[] = wanted;
				wanted = null;
				const answered = await write.mutateAsync(sending);
				if (answered) {
					kept = answered;
					// The server's own list (its words follow the positions) — unless a newer order already shows.
					if (!wanted) client.setQueryData<DoctorProfileImageFacts[]>(key, answered);
				}
			}
		} catch (error) {
			wanted = null;
			if (kept) client.setQueryData<DoctorProfileImageFacts[]>(key, kept);
			if (readDoctorPhotoFailure(error) === 'session') session?.expire({});
			orderFailure = m.doctor_photos_order_failed({}, messages());
			announcement = orderFailure;
		} finally {
			ordering = false;
			kept = null;
			refresh();
		}
	}

	return {
		get view() {
			return view;
		},
		/** The photos in the order the page shows: the server's, or the one just chosen. */
		get images() {
			return images;
		},
		get uploads() {
			return uploads;
		},
		get rejected() {
			return rejected;
		},
		/** More were picked than fit under the 20, or the server said the 20 are reached. */
		get full() {
			return full;
		},
		/** How many more photos may be picked now. */
		get room() {
			return doctorPhotoRoom(images.length, uploads.length);
		},
		/** What a reader is told of the last change of the order (`aria-live`). */
		get announcement() {
			return announcement;
		},
		get orderFailure() {
			return orderFailure;
		},
		add,
		/** «Ξανά»: the same file takes its turn again. */
		retry(id: number) {
			if (!files[id]) return;
			patch(id, { status: 'waiting', issue: null, progress: 0 });
			void pump();
		},
		/** «×»: a file that was not sent leaves the page. */
		drop(id: number) {
			const upload = uploads.find((entry) => entry.id === id);
			if (upload && upload.status !== 'sending') forget(id);
		},
		/** 🔴 D-W52-39: the photo `id` goes to the place `index` (from 0) — a drag's end, an arrow, «Κάντε την κύρια». */
		move(id: string, index: number) {
			const ids = stored().map((image) => image.id);
			const from = ids.indexOf(id);
			if (from < 0 || index < 0 || index >= ids.length || from === index) return;
			announcement = m.doctor_photos_moved({ position: index + 1, count: ids.length }, messages());
			void reorder(move(ids, from, index));
		},
		/** A drag's end: the whole order as it was left. */
		order(ids: readonly string[], movedId: string) {
			const index = ids.indexOf(movedId);
			if (index >= 0) {
				announcement = m.doctor_photos_moved(
					{ position: index + 1, count: ids.length },
					messages()
				);
			}
			void reorder([...ids]);
		},
		/** A photo was deleted: it leaves the list at once, and the profile is read again. */
		removed(id: string) {
			client.setQueryData<DoctorProfileImageFacts[]>(key, (old) =>
				old?.filter((image) => image.id !== id)
			);
			refresh();
		},
		reload() {
			void list.refetch();
		}
	};
}

export type DoctorPhotos = ReturnType<typeof useDoctorPhotos>;
