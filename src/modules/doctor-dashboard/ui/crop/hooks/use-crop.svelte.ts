import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { ApiError } from '$shared/lib/http';
import {
	CENTRED_IMAGE_CROP,
	cutImageToJpeg,
	imageCropRect,
	loadImage,
	maxImageCropZoom,
	type ImageCrop
} from '$shared/lib/image';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	doctorProfileImagesQuery,
	readDoctorPhotoFailure,
	replaceDoctorProfileImage,
	type DoctorProfileImageFacts
} from '$modules/doctor-dashboard/api/images';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_PHOTO_CROP_RULES,
	doctorPhotoIssueOf,
	doctorPhotoIssueText
} from '$modules/doctor-dashboard/lib/photos';
import type { DoctorPhotoCropState } from '../types';

/**
 * Wave 5.2 · screen 78 «Προσαρμογή» (U-206.2, D-W52-35 / 40): one photo of the session's own doctor, cut on the device.
 * - The photo is found in the photos' own read (the same cache as the grid); what is cut is the LARGEST size the server
 *   keeps of it (1200 × 900 — it keeps no original), loaded with CORS so that the canvas may be read back.
 * - The cut is a 4:3 part of at least 800 × 600 of those pixels, never more than they are; «Αποθήκευση» draws it as a
 *   JPEG and sends it in the photo's place (`PATCH`: the same id, the same position).
 * - Done ⇒ the photos and «Το προφίλ μου» are read again, «Αποθηκεύτηκε.», and the page closes. A refusal says the
 *   server's reason in the page's words and the cut STAYS; a `401` ends the session.
 */
export function useDoctorPhotoCrop(options: {
	imageId: () => string;
	locale: () => SupportedLocale;
	onDone: () => void;
	/** The device's own load and cut of a picture (the shared ones; a spec hands in its own). */
	load?: typeof loadImage;
	cut?: typeof cutImageToJpeg;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const load = options.load ?? loadImage;
	const cut = options.cut ?? cutImageToJpeg;
	const key = doctorDashboardQueryKeys.profileImages();
	const messages = () => ({ locale: options.locale() });

	const list = createQuery(() => ({ ...doctorProfileImagesQuery(), enabled: browser }));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read, 66's gotcha).
	const answer = $derived({ data: list.data, isError: list.isError, error: list.error });
	const image = $derived(answer.data?.find((entry) => entry.id === options.imageId()) ?? null);
	const address = $derived(image ? (image.largeUrl ?? image.mediumUrl) : null);

	// The picture as the browser read it — its own pixels are a fact of the file, not an answer of the API — and the
	// address that did not load. The element itself is what the canvas draws: never in rune state.
	let picture = $state<{ url: string; width: number; height: number } | null>(null);
	let unreadable = $state<string | null>(null);
	let element: HTMLImageElement | null = null;
	let attempt = $state(0);

	$effect(() => {
		const url = address;
		void attempt;
		if (!url) return;
		let stale = false;
		untrack(() => {
			unreadable = null;
			picture = null;
			element = null;
		});
		load(url).then(
			(loaded) => {
				if (stale) return;
				element = loaded;
				picture = { url, width: loaded.naturalWidth, height: loaded.naturalHeight };
			},
			() => {
				if (!stale) unreadable = url;
			}
		);
		return () => {
			stale = true;
		};
	});

	// One refusal ends the session once, however often the page draws itself again.
	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (error === ended || !(error instanceof ApiError) || error.status !== 401) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const source = $derived(
		picture && picture.url === address ? { width: picture.width, height: picture.height } : null
	);
	const state = $derived.by((): DoctorPhotoCropState => {
		if (answer.data === undefined) return answer.isError ? 'failed' : 'loading';
		if (!image) return 'missing';
		if (!address || unreadable === address) return 'unreadable';
		if (!source) return 'loading';
		return maxImageCropZoom(source, DOCTOR_PHOTO_CROP_RULES) === null ? 'small' : 'ready';
	});

	let crop = $state<ImageCrop>(CENTRED_IMAGE_CROP);
	let failure = $state<string | null>(null);
	// The write's own gate: the library tells of a write that began only a timer later (the `writing` gate of the
	// sign-up's steps), so a second press in between would send the cut twice.
	let saving = $state(false);

	const write = createMutation<DoctorProfileImageFacts | null, unknown, string>(() => ({
		networkMode: 'always' as const,
		mutationFn: async (imageId: string) => {
			if (!element || !source) throw new Error('The picture is not loaded');
			const file = cut(element, imageCropRect(source, DOCTOR_PHOTO_CROP_RULES, crop));
			return replaceDoctorProfileImage(imageId, file);
		},
		onSettled: () => {
			saving = false;
		},
		onSuccess: (saved) => {
			if (saved) {
				client.setQueryData<DoctorProfileImageFacts[]>(key, (old) =>
					old?.map((entry) => (entry.id === saved.id ? saved : entry))
				);
			}
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			toasts?.show({ message: m.doctor_photos_saved({}, messages()) });
			options.onDone();
		},
		onError: (error: unknown) => {
			const reason = readDoctorPhotoFailure(error);
			if (reason === 'session') session?.expire({});
			if (reason === 'gone') {
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.profile() });
			}
			failure =
				doctorPhotoIssueText(doctorPhotoIssueOf(reason), options.locale()) ??
				m.doctor_photos_crop_failed({}, messages());
		}
	}));

	return {
		get state() {
			return state;
		},
		/** The address the frame draws and the picture's own pixels; only while `state` is `ready`. */
		get src() {
			return address;
		},
		get source() {
			return source;
		},
		get crop() {
			return crop;
		},
		set crop(next: ImageCrop) {
			crop = next;
		},
		get failure() {
			return failure;
		},
		get saving() {
			return saving;
		},
		/** One press, one write: the cut as it stands now, in the photo's place. */
		save() {
			if (saving || state !== 'ready') return;
			saving = true;
			failure = null;
			write.mutate(options.imageId());
		},
		/** «Δοκιμάστε ξανά»: the photos, or the picture, are asked for again. */
		retry() {
			if (state === 'failed') void list.refetch();
			else attempt += 1;
		}
	};
}

export type DoctorPhotoCrop = ReturnType<typeof useDoctorPhotoCrop>;
