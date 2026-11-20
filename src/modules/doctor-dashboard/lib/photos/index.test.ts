import { describe, expect, it } from 'vitest';
import { mapDoctorProfileImage } from '$modules/doctor-dashboard/api/images';
import { samplePhotoView } from '$modules/doctor-dashboard/api/images/images.sample';
import {
	DOCTOR_PHOTO_ACCEPT,
	DOCTOR_PHOTO_CROP_RULES,
	DOCTOR_PHOTO_FILE_RULES,
	DOCTOR_PHOTO_LIMIT,
	doctorPhotoAlt,
	doctorPhotoArrowTarget,
	doctorPhotoDropTarget,
	doctorPhotoIssueOf,
	doctorPhotoIssueOfFile,
	doctorPhotoIssueRetries,
	doctorPhotoIssueText,
	doctorPhotoRoom,
	sameDoctorPhotoOrder
} from '.';

describe('the rules of «Φωτογραφίες» (wave 5.2 · screen 78)', () => {
	it('🔴 U-206 · D-W52-29 / D-W52-30 / D-W52-38: up to 20 photos, each a JPG, a PNG or a WebP of at most 10 MB and at least 800 × 600 — the server’s own numbers', () => {
		expect(DOCTOR_PHOTO_LIMIT).toBe(20);
		expect(DOCTOR_PHOTO_FILE_RULES).toEqual({
			types: ['image/jpeg', 'image/png', 'image/webp'],
			maxBytes: 10_485_760,
			minWidth: 800,
			minHeight: 600
		});
		expect(DOCTOR_PHOTO_ACCEPT).toBe('image/jpeg,image/png,image/webp');
		// The web converts nothing: HEIC is the application's.
		expect(DOCTOR_PHOTO_ACCEPT).not.toMatch(/hei[cf]/iu);
	});

	it('🔴 D-W52-40: «Προσαρμογή» cuts in 4:3 and never under the 800 × 600 the server accepts', () => {
		expect(DOCTOR_PHOTO_CROP_RULES).toEqual({ aspect: 4 / 3, minWidth: 800, minHeight: 600 });
	});

	it('🔴 U-140 · D-W52-38: the page’s words for each reason, word for word — the device’s check and the server’s refusal say the SAME ones', () => {
		expect(doctorPhotoIssueText('limit', 'el')).toBe('Έως 20 φωτογραφίες.');
		expect(doctorPhotoIssueText('small', 'el')).toBe(
			'Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.'
		);
		expect(doctorPhotoIssueText('large', 'el')).toBe('Πολύ μεγάλο αρχείο: έως 10 MB.');
		expect(doctorPhotoIssueText('type', 'el')).toBe('Ανεβάστε JPG, PNG ή WebP.');
		expect(doctorPhotoIssueText('failed', 'el')).toBeNull();
		expect(doctorPhotoIssueText('large', 'en')).toBe('The file is too large: up to 10 MB.');
		// The device's check …
		expect(doctorPhotoIssueOfFile('type')).toBe('type');
		expect(doctorPhotoIssueOfFile('size')).toBe('large');
		expect(doctorPhotoIssueOfFile('dimensions')).toBe('small');
		// … and the server's refusal.
		for (const reason of ['limit', 'small', 'large', 'type'] as const) {
			expect(doctorPhotoIssueOf(reason)).toBe(reason);
		}
	});

	it('🔴 D-W52-38 (negative): a refusal the page has no words for is «Δεν ανέβηκε» · «Ξανά» — and a file refused for what it IS is never offered again', () => {
		for (const reason of ['session', 'gone', 'rate-limited', 'forbidden', 'unknown'] as const) {
			expect(doctorPhotoIssueOf(reason), reason).toBe('failed');
		}
		expect(doctorPhotoIssueRetries('failed')).toBe(true);
		for (const issue of ['limit', 'small', 'large', 'type'] as const) {
			expect(doctorPhotoIssueRetries(issue), issue).toBe(false);
		}
	});

	it('🔴 D-W52-29: how many more fit — 20 less the stored and those on their way, never under zero', () => {
		expect(doctorPhotoRoom(0, 0)).toBe(20);
		expect(doctorPhotoRoom(4, 0)).toBe(16);
		expect(doctorPhotoRoom(17, 2)).toBe(1);
		expect(doctorPhotoRoom(19, 1)).toBe(0);
		expect(doctorPhotoRoom(20, 0)).toBe(0);
		// A doctor of before the limit, or a broken count, never opens room.
		expect(doctorPhotoRoom(26, 0)).toBe(0);
		expect(doctorPhotoRoom(20, 5)).toBe(0);
		expect(doctorPhotoRoom(-3, -1)).toBe(20);
	});

	it('D-W52-33: a photo is named by the server’s words in the page’s language, else «Φωτογραφία N από M»', () => {
		const image = mapDoctorProfileImage(samplePhotoView(2));
		if (!image) throw new Error('no image');
		expect(doctorPhotoAlt(image, 2, 4, 'el')).toBe('Ελένη Παππά, φωτογραφία 2');
		expect(doctorPhotoAlt(image, 2, 4, 'en')).toBe('Eleni Pappa, photo 2');
		const wordless = { ...image, alt: { el: null, en: null } };
		expect(doctorPhotoAlt(wordless, 2, 4, 'el')).toBe('Φωτογραφία 2 από 4');
		expect(doctorPhotoAlt(wordless, 2, 4, 'en')).toBe('Photo 2 of 4');
	});

	it('🔴 D-W52-39: an arrow takes the focused photo ONE place — left / up towards the start, right / down towards the end — never past either end, and no other key moves it', () => {
		expect(doctorPhotoArrowTarget('ArrowLeft', 2, 4)).toBe(1);
		expect(doctorPhotoArrowTarget('ArrowUp', 2, 4)).toBe(1);
		expect(doctorPhotoArrowTarget('ArrowRight', 2, 4)).toBe(3);
		expect(doctorPhotoArrowTarget('ArrowDown', 2, 4)).toBe(3);
		expect(doctorPhotoArrowTarget('ArrowLeft', 0, 4)).toBeNull();
		expect(doctorPhotoArrowTarget('ArrowRight', 3, 4)).toBeNull();
		expect(doctorPhotoArrowTarget('ArrowRight', 0, 1)).toBeNull();
		for (const key of ['Enter', ' ', 'Home', 'End', 'Tab', 'a', 'Escape']) {
			expect(doctorPhotoArrowTarget(key, 1, 4), key).toBeNull();
		}
	});

	it('🔴 D-W52-39: while a photo is dragged, the one under the pointer is the first OTHER tile whose box holds the point — none over its own place, a gap or outside the grid', () => {
		const box = (left: number, top: number) => ({
			left,
			top,
			right: left + 100,
			bottom: top + 75
		});
		const tiles = [
			{ id: 'a', box: box(0, 0) },
			{ id: 'b', box: box(110, 0) },
			{ id: 'c', box: box(220, 0) }
		];
		expect(doctorPhotoDropTarget({ x: 150, y: 40 }, tiles, 'a')).toBe('b');
		expect(doctorPhotoDropTarget({ x: 220, y: 75 }, tiles, 'a')).toBe('c');
		expect(doctorPhotoDropTarget({ x: 50, y: 40 }, tiles, 'a')).toBeNull();
		expect(doctorPhotoDropTarget({ x: 105, y: 40 }, tiles, 'a')).toBeNull();
		expect(doctorPhotoDropTarget({ x: 150, y: 200 }, tiles, 'a')).toBeNull();
		expect(doctorPhotoDropTarget({ x: 150, y: 40 }, [], 'a')).toBeNull();
	});

	it('two orders are the same only with the same photos in the same places', () => {
		expect(sameDoctorPhotoOrder(['a', 'b'], ['a', 'b'])).toBe(true);
		expect(sameDoctorPhotoOrder([], [])).toBe(true);
		expect(sameDoctorPhotoOrder(['a', 'b'], ['b', 'a'])).toBe(false);
		expect(sameDoctorPhotoOrder(['a', 'b'], ['a'])).toBe(false);
	});
});
