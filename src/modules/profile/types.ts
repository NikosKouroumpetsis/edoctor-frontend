import type { IoniconName } from '$shared/ui/icons/ionicon';

/** A row of the `/profile` page: what it does is the screen's (a page, or a window of the frame). */
export type ProfileMenuRowId = 'relatives' | 'account-settings' | 'help' | 'privacy' | 'legal';

export type ProfileMenuRow = { id: ProfileMenuRowId; icon: IoniconName; label: string };

export type ProfileMenuSection = { id: 'account' | 'legal'; rows: ProfileMenuRow[] };

export type ProfileMenuSectionSeed = {
	id: ProfileMenuSection['id'];
	rows: { id: ProfileMenuRowId; icon: IoniconName }[];
};
