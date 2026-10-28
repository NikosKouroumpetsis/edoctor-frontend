<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Card } from '$shared/ui/primitives/card';
	import { Button } from '$shared/ui/primitives/button';
	import { Text } from '$shared/ui/primitives/text';

	// The application's meta (`molecules/card`): its one shell with a 12 column gap.
	const { Story } = defineMeta({
		title: 'Primitives/Card',
		component: Card,
		tags: ['autodocs'],
		args: { class: 'gap-3' },
		argTypes: { class: { control: 'text' } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Card {...args}>
			<Text variant="heading">Κάρτα γιατρού</Text>
			<Text class="text-body-md text-muted-foreground">
				Η κοινή επιφάνεια κάρτας με ακτίνα `xl`, απαλή σκίαση και χρώμα card.
			</Text>
		</Card>
	{/snippet}
</Story>

<Story name="With Action">
	{#snippet template(args)}
		<Card {...args} class="gap-4">
			<Text variant="heading">Επόμενο ραντεβού</Text>
			<Text class="text-body-md text-muted-foreground">Δρ. Παπαδοπούλου · Τρίτη 10:00</Text>
			<Button label="Προβολή" radius="md" tone="primary" />
		</Card>
	{/snippet}
</Story>
