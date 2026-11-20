import {
	httpSessionDelete,
	httpSessionGet,
	httpSessionPut,
	httpSessionUpload
} from '$shared/lib/http';
import { mapDoctorProfileImage, mapDoctorProfileImages } from './map';
import type {
	DoctorPhotoSendOptions,
	DoctorProfileImageFacts,
	DoctorProfileImagesView,
	DoctorProfileImageView
} from './types';

const IMAGES_PATH = '/doctor/profile/images';
const imagePath = (imageId: string) => `${IMAGES_PATH}/${encodeURIComponent(imageId)}`;

/** The file's name the API reads its type by: a fixed word and the type's own ending — never the person's file name. */
const ENDINGS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};
function fileNameOf(dataUri: string): string | undefined {
	const type = /^data:([a-z0-9.+/-]+);base64,/iu.exec(dataUri)?.[1]?.toLowerCase();
	const ending = type ? ENDINGS[type] : undefined;
	return ending ? `photo.${ending}` : undefined;
}

/**
 * D-W52-36: the photos of the session's own doctor in the server's order (`no-store`, with the cookies) — nothing in
 * the request names a doctor. `null` for an answer that is no list.
 */
export async function getDoctorProfileImages(
	signal?: AbortSignal
): Promise<DoctorProfileImageFacts[] | null> {
	return mapDoctorProfileImages(
		await httpSessionGet<DoctorProfileImagesView>(IMAGES_PATH, { signal })
	);
}

/**
 * 🔴 D-W52-28 / 38: one new photo — the file as a base64 `data:` text inside the JSON, nothing else: the server writes
 * the words and the place itself (D-W52-33: what a doctor sends of them is not read). It tells how much has been sent.
 * The stored photo, last in the order; `null` for an answer that is no image.
 */
export async function uploadDoctorProfileImage(
	file: string,
	options: DoctorPhotoSendOptions = {}
): Promise<DoctorProfileImageFacts | null> {
	return mapDoctorProfileImage(
		await httpSessionUpload<DoctorProfileImageView>('POST', IMAGES_PATH, {
			body: { image: { file, fileName: fileNameOf(file) } },
			...options
		})
	);
}

/** 🔴 D-W52-35: «Προσαρμογή» — a new file in the place of the old one: the same id, the same position, new addresses. */
export async function replaceDoctorProfileImage(
	imageId: string,
	file: string,
	options: DoctorPhotoSendOptions = {}
): Promise<DoctorProfileImageFacts | null> {
	return mapDoctorProfileImage(
		await httpSessionUpload<DoctorProfileImageView>('PATCH', imagePath(imageId), {
			body: { image: { file, fileName: fileNameOf(file) } },
			...options
		})
	);
}

/** D-W52-34: one photo goes; the server closes the positions up (the next one becomes the main one). */
export async function deleteDoctorProfileImage(imageId: string): Promise<void> {
	await httpSessionDelete<unknown>(imagePath(imageId), { body: {} });
}

/**
 * 🔴 D-W52-31: the whole order in ONE call — every photo of the doctor once, the first the main one («Κάντε την κύρια»
 * is this call with that photo first). The list as the server now keeps it; `null` for an answer that is no list.
 */
export async function reorderDoctorProfileImages(
	imageIds: readonly string[]
): Promise<DoctorProfileImageFacts[] | null> {
	return mapDoctorProfileImages(
		await httpSessionPut<DoctorProfileImagesView>(`${IMAGES_PATH}/order`, {
			body: { imageIds: [...imageIds] }
		})
	);
}
