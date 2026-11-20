import { ApiError } from '$shared/lib/http';
import type { DoctorPhotoFailure } from './types';

/**
 * 🔴 D-W52-29 / 30 / 31 (`w52-b2` §8): why a write of the photos was refused, read from the status and — where the
 * server names no code of its own — from the code it writes at the end of its message (`DOCTOR_IMAGE_LIMIT_REACHED`,
 * `IMAGE_TOO_SMALL`, `DOCTOR_IMAGE_ORDER_MISMATCH`) or its own words for the weight and the type of a file. A body the
 * API will not even read (`413`) is a file too heavy. Anything else is `unknown`: the page offers «Ξανά».
 */
export function readDoctorPhotoFailure(error: unknown): DoctorPhotoFailure {
	if (!(error instanceof ApiError)) return 'unknown';
	const { status, message } = error;
	if (status === 401) return 'session';
	if (status === 403) return 'forbidden';
	if (status === 404) return 'gone';
	if (status === 413) return 'large';
	if (status === 429) return 'rate-limited';
	if (status === 409) return message.includes('DOCTOR_IMAGE_LIMIT_REACHED') ? 'limit' : 'unknown';
	if (status === 422) {
		if (message.includes('IMAGE_TOO_SMALL')) return 'small';
		if (message.includes('DOCTOR_IMAGE_ORDER_MISMATCH')) return 'gone';
		if (/file size exceeds/iu.test(message)) return 'large';
		if (/mimeType|file type is not supported/iu.test(message)) return 'type';
	}
	return 'unknown';
}
