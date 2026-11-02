<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { LinkDirectory } from '$shared/ui/molecules/link-directory';

	const at = (value: string) => ({ viewport: { value, isRotated: false } });

	const cities = ['Αθήνα', 'Θεσσαλονίκη', 'Πειραιάς', 'Πάτρα', 'Ηράκλειο', 'Λάρισα'];
	const tabs = [
		{
			id: 'specialties',
			label: 'Ειδικότητες',
			links: [
				'Καρδιολόγοι',
				'Παιδίατροι',
				'Δερματολόγοι',
				'Ψυχολόγοι',
				'Οδοντίατροι',
				'Γυναικολόγοι',
				'Ορθοπαιδικοί',
				'Οφθαλμίατροι',
				'Παθολόγοι',
				'Ενδοκρινολόγοι',
				'Νευρολόγοι',
				'Ψυχίατροι',
				'Ουρολόγοι',
				'Αλλεργιολόγοι'
			].map((label, index) => ({
				label,
				description: cities[index % cities.length],
				href: `#specialty-${index}`
			}))
		},
		{
			id: 'areas',
			label: 'Περιοχές',
			links: cities.map((label, index) => ({
				label,
				description: 'Γιατροί όλων των ειδικοτήτων',
				href: `#area-${index}`
			}))
		},
		{
			id: 'online',
			label: 'Online',
			links: cities.slice(0, 4).map((city, index) => ({
				label: 'Βιντεοκλήση',
				description: city,
				href: `#online-${index}`
			}))
		}
	];

	const { Story } = defineMeta({
		title: 'Molecules/LinkDirectory',
		component: LinkDirectory,
		tags: ['autodocs'],
		args: {
			title: 'Δημοφιλείς αναζητήσεις',
			tabs,
			initialCount: 11,
			moreLabel: 'Εμφάνιση περισσότερων'
		}
	});
</script>

<!-- Airbnb's popular searches: the tabs, then the links in 2 columns on the phone; «more» shows the rest. -->
<Story name="Default">
	{#snippet template(args)}
		<LinkDirectory {...args} />
	{/snippet}
</Story>

<!-- fin1: the phone's narrow cells (~150): «Εμφάνιση περισσότερων ⌄» wraps in its cell, never past the page. -->
<Story name="Narrow cells" globals={at('z375')}>
	{#snippet template(args)}
		<LinkDirectory {...args} />
	{/snippet}
</Story>

<!-- 4 columns from 744. -->
<Story name="On the tablet" globals={at('z744')}>
	{#snippet template(args)}
		<LinkDirectory {...args} />
	{/snippet}
</Story>

<!-- 6 columns from 1128. -->
<Story name="On the laptop" globals={at('z1128')}>
	{#snippet template(args)}
		<LinkDirectory {...args} />
	{/snippet}
</Story>

<!-- Every link at once, without «more». -->
<Story name="Without more">
	{#snippet template()}
		<LinkDirectory title="Δημοφιλείς αναζητήσεις" {tabs} />
	{/snippet}
</Story>
