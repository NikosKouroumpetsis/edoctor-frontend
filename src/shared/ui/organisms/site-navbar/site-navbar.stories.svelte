<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import { SiteNavbar } from '$shared/ui/organisms/site-navbar';

	const props = {
		brand: 'Δείγμα',
		brandHref: '#home',
		brandIcon: 'medical-outline' as const,
		links: [
			{ label: 'Ενότητα Α', href: '#a' },
			{ label: 'Ενότητα Β', href: '#b' },
			{ label: 'Ενότητα Γ', href: '#c' }
		],
		primaryNavLabel: 'Κύρια πλοήγηση',
		mobileNavLabel: 'Πλοήγηση κινητού',
		openMenuLabel: 'Άνοιγμα μενού',
		closeMenuLabel: 'Κλείσιμο',
		userName: 'Δείγμα Χρήστη',
		accountMenuLabel: 'Λογαριασμός',
		menuItems: [
			{ label: 'Προφίλ' },
			{ label: 'Ρυθμίσεις' },
			{ label: 'Αποσύνδεση', destructive: true }
		]
	};

	const { Story } = defineMeta({
		title: 'Organisms/SiteNavbar',
		component: SiteNavbar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Default">
	{#snippet template()}
		<SiteNavbar {...props} />
	{/snippet}
</Story>

<Story
	name="Account Menu"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Λογαριασμός' }));
		await expect(await screen.findByText('Ρυθμίσεις')).toBeVisible();
	}}
>
	{#snippet template()}
		<SiteNavbar {...props} />
	{/snippet}
</Story>

<!-- The menu button and the mobile sheet show below `laptop:` (1128): the z375 viewport. The menu slides in from the
     right and the backdrop fades (U-09.8, whatever the motion setting, U-12.1). -->
<Story name="Mobile Sheet" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<SiteNavbar {...props} />
	{/snippet}
</Story>
