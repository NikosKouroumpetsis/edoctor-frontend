<script lang="ts">
	import { SiteNavbar } from './index';

	let { userName }: { userName?: string } = $props();
</script>

<SiteNavbar
	brand="Δείγμα"
	brandHref="/"
	brandIcon="medical-outline"
	links={[
		{ label: 'Ενότητα Α', href: '/a' },
		{ label: 'Ενότητα Β', href: '/b' }
	]}
	primaryNavLabel="Κύρια"
	mobileNavLabel="Κινητό"
	openMenuLabel="Άνοιγμα μενού"
	closeMenuLabel="Κλείσιμο"
	{userName}
	accountMenuLabel="Λογαριασμός"
	menuItems={[{ label: 'Προφίλ' }, { label: 'Αποσύνδεση', destructive: true }]}
/>
