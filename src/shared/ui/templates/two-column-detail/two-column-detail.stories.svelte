<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container } from '$shared/ui/molecules/container';
	import { Section } from '$shared/ui/molecules/section';
	import { TwoColumnDetail } from '$shared/ui/templates/two-column-detail';

	const sections = ['Σχετικά', 'Υπηρεσίες', 'Κριτικές', 'Τοποθεσία', 'Τι πρέπει να γνωρίζετε'];

	const { Story } = defineMeta({
		title: 'Templates/TwoColumnDetail',
		component: TwoColumnDetail,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet mainColumn()}
	<div class="flex flex-col gap-section">
		{#each sections as title, index (title)}
			<Section variant="ruled" {title} showRule={index > 0}>
				<div class="h-card-list-media rounded-xl bg-muted"></div>
			</Section>
		{/each}
	</div>
{/snippet}

{#snippet card(label: string)}
	<div class="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-card shadow-soft">
		<p class="text-title-sm font-semibold text-foreground">{label}</p>
		<div class="min-h-control-md rounded-full bg-accent"></div>
	</div>
{/snippet}

<Story name="Aside At End">
	{#snippet template()}
		<!-- One column below 950; from 950 the card sticks under the 64 bar while the main column scrolls. -->
		<Container width="listing" class="py-section">
			<TwoColumnDetail>
				{#snippet aside()}{@render card('Κάρτα κράτησης')}{/snippet}
				{@render mainColumn()}
			</TwoColumnDetail>
		</Container>
	{/snippet}
</Story>

<Story name="Aside At Start">
	{#snippet template()}
		<Container width="listing" class="py-section">
			<TwoColumnDetail asidePosition="start">
				{#snippet aside()}{@render card('Ταυτότητα')}{/snippet}
				{@render mainColumn()}
			</TwoColumnDetail>
		</Container>
	{/snippet}
</Story>

<Story name="Aside Not Sticky">
	{#snippet template()}
		<Container width="listing" class="py-section">
			<TwoColumnDetail stickyAside={false}>
				{#snippet aside()}{@render card('Πλευρική στήλη')}{/snippet}
				{@render mainColumn()}
			</TwoColumnDetail>
		</Container>
	{/snippet}
</Story>
