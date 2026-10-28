<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SiteFooter from '$shared/ui/organisms/site-footer';

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

<Story name="With Actions">
	{#snippet template()}
		<SiteFooter {columns} legalNote="© Δείγμα." reserveBottomNav="laptop">
			{#snippet actions()}
				<span class="text-body-sm text-muted-foreground">Ενέργειες του καλούντα</span>
			{/snippet}
		</SiteFooter>
	{/snippet}
</Story>
