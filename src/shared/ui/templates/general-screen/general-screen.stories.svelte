<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { Card } from '$shared/ui/primitives/card';
	import { Text } from '$shared/ui/primitives/text';
	import { GeneralScreenTemplate } from '$shared/ui/templates/general-screen';

	const noop = () => {};
	const base = { backLabel: 'Πίσω', navTitle: 'Ρυθμίσεις', title: 'Προτιμήσεις', onBack: noop };
	const paragraphs = Array.from({ length: 12 }, (_, index) => `Παράγραφος ${index + 1}.`);

	// The application's meta (`templates/general-screen`): «Ρυθμίσεις» in the bar, «Προτιμήσεις» over the language
	// card. The web keeps the page's full canvas.
	const { Story } = defineMeta({
		title: 'Templates/GeneralScreen',
		component: GeneralScreenTemplate,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: base,
		argTypes: { navTitle: { control: 'text' }, title: { control: 'text' } }
	});
</script>

<!-- The settings card the examples share. -->
{#snippet languageCard()}
	<Card class="gap-2">
		<Text variant="heading">Γλώσσα</Text>
		<Text class="text-body-md text-muted-foreground">Επιλέξτε τη γλώσσα της εφαρμογής.</Text>
	</Card>
{/snippet}

<Story name="Playground">
	{#snippet template()}
		<GeneralScreenTemplate {...base}>{@render languageCard()}</GeneralScreenTemplate>
	{/snippet}
</Story>

<Story name="Without Title">
	{#snippet template()}
		<GeneralScreenTemplate {...base} title={undefined} navTitle="Λεπτομέρειες">
			<Card class="gap-2">
				<Text class="text-body-md text-muted-foreground">Περιεχόμενο χωρίς επικεφαλίδα.</Text>
			</Card>
		</GeneralScreenTemplate>
	{/snippet}
</Story>

<Story name="Without Nav Title">
	{#snippet template()}
		<GeneralScreenTemplate {...base} navTitle={undefined}>
			{@render languageCard()}
		</GeneralScreenTemplate>
	{/snippet}
</Story>

<!-- A pinned footer outside the scroll: the column under it scrolls, the two actions stay. -->
<Story name="With Footer">
	{#snippet template()}
		<GeneralScreenTemplate {...base}>
			{#each paragraphs as text (text)}
				<p class="text-body-lg text-foreground/88">{text}</p>
			{/each}
			{#snippet footer()}
				<ActionBar
					preset="plain"
					primaryLabel="Αποθήκευση"
					secondaryLabel="Ακύρωση"
					onPrimaryClick={noop}
					onSecondaryClick={noop}
				/>
			{/snippet}
		</GeneralScreenTemplate>
	{/snippet}
</Story>

<Story name="Content Width">
	{#snippet template()}
		<GeneralScreenTemplate {...base} maxWidth="content">
			<p class="text-body-lg text-foreground/88">Στήλη content (760) αντί για form (560).</p>
		</GeneralScreenTemplate>
	{/snippet}
</Story>
