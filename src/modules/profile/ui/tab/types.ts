import type { ResolvedPathname } from '$app/types';
import type { ProfileMenuRowId } from '$modules/profile/types';

export type ProfileTabProps = {
	locale: 'el' | 'en';
	/** A row that is a page: its address in the page's language. */
	hrefOf: (row: ProfileMenuRowId) => ResolvedPathname | null;
	/** A row that is a window of the frame (the settings, the consent). */
	onRow: (row: ProfileMenuRowId) => void;
};
