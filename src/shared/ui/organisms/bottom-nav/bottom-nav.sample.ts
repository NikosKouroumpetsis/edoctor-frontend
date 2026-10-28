import type { BottomNavItem } from './bottom-nav.svelte';

/** Sample tabs for the stories and the tests (the product's own live in its shell module). */
export const sampleBottomNavItems: BottomNavItem[] = [
	{
		key: 'search',
		label: 'Αναζήτηση',
		icon: 'search-outline',
		activeIcon: 'search',
		href: '#search',
		current: true
	},
	{ key: 'favorites', label: 'Αγαπημένα', icon: 'heart-outline', activeIcon: 'heart' },
	{ key: 'appointments', label: 'Ραντεβού', icon: 'calendar-outline', activeIcon: 'calendar' },
	{ key: 'messages', label: 'Μηνύματα', icon: 'chatbubble-outline', activeIcon: 'chatbubble' },
	{ key: 'profile', label: 'Προφίλ', icon: 'person-outline', activeIcon: 'person' }
];
