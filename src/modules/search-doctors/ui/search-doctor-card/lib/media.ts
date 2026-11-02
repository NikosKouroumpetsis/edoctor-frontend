import type { MediaCardAspect } from '$shared/ui/organisms/media-card';
import type { SearchDoctorCardVariant } from '../types';

/**
 * 🔴 MINOR-5 (U-29, the D13 rule of `cardSizeOf`): the doctor card's photo per variant in ONE map — the card's
 * `aspect` (U-20's 1:1 on the home's rails, U-24.1's 4:3 in the results' list) and the class its skeletons draw, so a
 * placeholder is always the shape of what replaces it.
 */
export const searchDoctorCardMedia = {
	rail: { aspect: '1/1', skeletonClass: 'aspect-square' },
	list: { aspect: '4/3', skeletonClass: 'aspect-4/3' }
} as const satisfies Record<
	SearchDoctorCardVariant,
	{ aspect: MediaCardAspect; skeletonClass: string }
>;
