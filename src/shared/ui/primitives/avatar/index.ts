import Root, { avatarSizes, type AvatarSize } from './avatar.svelte';
import Image from './avatar-image.svelte';
import Fallback from './avatar-fallback.svelte';

export {
	Root,
	Image,
	Fallback,
	avatarSizes,
	type AvatarSize,
	//
	Root as Avatar,
	Image as AvatarImage,
	Fallback as AvatarFallback
};
