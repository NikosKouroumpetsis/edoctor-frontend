import type { ProfileAddress } from '$modules/profile/lib/paths';

/** The route's data (D-W4-51): the «Προφίλ» tab, or a page under it from the closed list. */
export type ProfileScreenData = { address: ProfileAddress };

export type ProfileScreenProps = { data: ProfileScreenData };
