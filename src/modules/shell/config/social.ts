import type { IoniconName } from '$shared/ui/icons/ionicon';

/**
 * 🔴 U-26.2: the footer's social networks in ONE place. An empty `url` draws the icon without a link (no `#`, no
 * button that does nothing); when the owner gives an address, it is one line here and the icon becomes a link that
 * opens in a new tab. The names are the networks' own, the same in every language.
 */
export type SocialNetwork = { key: string; label: string; icon: IoniconName; url: string };

export const socialNetworks: SocialNetwork[] = [
	{ key: 'facebook', label: 'Facebook', icon: 'logo-facebook', url: '' },
	{ key: 'x', label: 'X', icon: 'logo-x', url: '' },
	{ key: 'instagram', label: 'Instagram', icon: 'logo-instagram', url: '' }
];
