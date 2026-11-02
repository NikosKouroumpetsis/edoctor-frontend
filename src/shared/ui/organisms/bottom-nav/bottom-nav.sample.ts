import type { BottomNavItem } from './bottom-nav.svelte';

/** Sample tabs for the stories and the tests (the product's own live in its shell module). */
export const sampleBottomNavItems: BottomNavItem[] = [
	{
		key: 'explore',
		label: 'Εξερευνήστε',
		icon: 'search-outline',
		activeIcon: 'search',
		href: '#explore',
		current: true
	},
	{ key: 'favorites', label: 'Αγαπημένα', icon: 'heart-outline', activeIcon: 'heart' },
	{ key: 'profile', label: 'Προφίλ', icon: 'person-outline', activeIcon: 'person' }
];
