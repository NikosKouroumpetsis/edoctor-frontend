<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SiteFooter from '$shared/ui/organisms/site-footer';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { LinkDirectory } from '$shared/ui/molecules/link-directory';

	const socialIcons = ['logo-facebook', 'logo-x', 'logo-instagram'] as const;

	// Airbnb's popular searches over the columns (U-16.9): the caller's directory in the `popular` slot.
	const popularTabs = [
		{
			id: 'specialties',
			label: 'Ειδικότητες',
			links: [
				{ label: 'Καρδιολόγοι', description: 'Αθήνα', href: '#cardiology-athens' },
				{ label: 'Παιδίατροι', description: 'Θεσσαλονίκη', href: '#pediatrics-thessaloniki' },
				{ label: 'Δερματολόγοι', description: 'Πειραιάς', href: '#dermatology-piraeus' },
				{ label: 'Ψυχολόγοι', description: 'Μαρούσι', href: '#psychology-marousi' }
			]
		},
		{
			id: 'areas',
			label: 'Περιοχές',
			links: [{ label: 'Αθήνα', description: 'Όλες οι ειδικότητες', href: '#athens' }]
		}
	];

	const columns = [
		{
			title: 'Υποστήριξη',
			links: [{ label: 'Κέντρο βοήθειας' }, { label: 'Επικοινωνία' }, { label: 'Ασφάλεια' }]
		},
		{
			title: 'Εταιρεία',
			links: [
				{ label: 'Σχετικά', href: '#about' },
				{ label: 'Καριέρα', href: '#careers' }
			]
		},
		{
			title: 'Νομικά',
			links: [
				{ label: 'Όροι χρήσης' },
				{ label: 'Απόρρητο' },
				{ label: 'Διαγραφή λογαριασμού', href: '#account-deletion' }
			]
		}
	];

	const { Story } = defineMeta({
		title: 'Organisms/SiteFooter',
		component: SiteFooter,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: {
			columns,
			legalNote: '© Δείγμα. Με την επιφύλαξη παντός δικαιώματος.',
			legalLinks: [
				{ label: 'Όροι' },
				{ label: 'Απόρρητο' },
				{ label: 'Cookies', href: '#cookies' }
			],
			reserveBottomNav: false
		}
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<SiteFooter {...args} />
	{/snippet}
</Story>

<Story name="Columns Only">
	{#snippet template()}
		<SiteFooter {columns} reserveBottomNav={false} />
	{/snippet}
</Story>

<!-- The eDoctor footer's shape (U-16.9): popular searches, three columns, the language and the networks (icons
     without an address are named images, U-26.2), the rights line with the legal links; room for the capsule. -->
<Story name="Airbnb">
	{#snippet template()}
		<SiteFooter
			{columns}
			legalNote="© 2026 Δείγμα"
			legalLinks={[
				{ label: 'Απόρρητο', href: '#privacy' },
				{ label: 'Όροι', href: '#terms' },
				{ label: 'Cookies', href: '#cookies' }
			]}
		>
			{#snippet popular()}
				<LinkDirectory title="Δημοφιλείς αναζητήσεις" tabs={popularTabs} />
			{/snippet}
			{#snippet actions()}
				<button
					type="button"
					class="inline-flex min-h-touch min-w-touch flex-row items-center gap-2.5 text-body-sm font-semibold text-foreground"
				>
					<Ionicon name="globe-outline" class="icon-md" />
					Ελληνικά (GR)
				</button>
				<span class="flex flex-row items-center gap-2">
					{#each socialIcons as icon (icon)}
						<span role="img" aria-label={icon} class="grid size-touch place-items-center">
							<Ionicon name={icon} class="icon-md" />
						</span>
					{/each}
				</span>
			{/snippet}
		</SiteFooter>
	{/snippet}
</Story>

<Story name="With Actions">
	{#snippet template()}
		<SiteFooter {columns} legalNote="© Δείγμα." reserveBottomNav="laptop">
			{#snippet actions()}
				<span class="text-body-sm text-muted-foreground">Ενέργειες του καλούντα</span>
			{/snippet}
		</SiteFooter>
	{/snippet}
</Story>
