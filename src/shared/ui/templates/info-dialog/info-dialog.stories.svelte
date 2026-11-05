<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InfoDialog } from '$shared/ui/templates/info-dialog';
	import { Button } from '$shared/ui/primitives/button';

	// U-67.1: a title, its text and the links, as a small window from 744 and a sheet below it.
	const { Story } = defineMeta({
		title: 'Templates/InfoDialog',
		component: InfoDialog,
		tags: ['autodocs'],
		parameters: { docs: { story: { inline: false, iframeHeight: 640 } } }
	});
</script>

<script lang="ts">
	let open = $state(true);
</script>

<Story name="Default">
	{#snippet template()}
		<Button tone="outline" label="Άνοιγμα" onclick={() => (open = true)} />
		<InfoDialog
			bind:open
			title="Πώς λειτουργούν οι κριτικές"
			closeLabel="Κλείσιμο"
			blocks={[
				{
					heading: 'Ποιος γράφει κριτική',
					text: 'Μόνο ο ασθενής, αφού ολοκληρωθεί το ραντεβού του.'
				},
				{ heading: 'Έλεγχος', text: 'Η ομάδα ελέγχει κάθε κριτική πριν δημοσιευτεί.' }
			]}
			links={[{ label: 'Μάθετε περισσότερα στο Κέντρο βοήθειας', href: '#help' }]}
		/>
	{/snippet}
</Story>

<Story name="With rows">
	{#snippet template()}
		<Button tone="outline" label="Άνοιγμα" onclick={() => (open = true)} />
		<InfoDialog
			bind:open
			title="Πολιτική ακύρωσης"
			intro={[
				{ text: 'Ισχύει για το ιατρείο ' },
				{ text: 'Νίκης 12', emphasis: true },
				{ text: '.' }
			]}
			closeLabel="Κλείσιμο"
			blocks={[
				{
					heading: 'Ακύρωση',
					rows: [
						{
							key: 'a',
							icon: 'calendar-outline',
							label: 'Έως 4 ώρες πριν',
							sub: 'Από τη σελίδα του ραντεβού.'
						},
						{
							key: 'b',
							icon: 'call-outline',
							label: 'Μετά το όριο',
							sub: 'Επικοινωνήστε με το ιατρείο:',
							link: { label: '210 1234567', href: 'tel:2101234567' }
						}
					]
				}
			]}
		/>
	{/snippet}
</Story>
