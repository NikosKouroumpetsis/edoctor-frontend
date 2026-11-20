<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { LinkCard } from '$shared/ui/molecules/link-card';
	import { Rating } from '$shared/ui/primitives/rating';

	const { Story } = defineMeta({
		title: 'Molecules/LinkCard',
		component: LinkCard,
		tags: ['autodocs'],
		args: {
			href: '#appointment',
			icon: 'calendar-outline',
			label: 'Το ραντεβού',
			title: 'Τετάρτη 11 Νοεμβρίου, 10:00 · Ηλεκτροκαρδιογράφημα'
		}
	});
</script>

<!-- What a review is about: its appointment, one press away. -->
<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><LinkCard {...args} /></div>
	{/snippet}
</Story>

<!-- A strong line the caller draws: stars and a day, the link named aloud. -->
<Story name="With stars">
	{#snippet template()}
		<div class="w-full max-w-form">
			<LinkCard
				href="#review"
				icon="star-outline"
				label="Η κριτική του ασθενή"
				name="Η κριτική του ασθενή: 5 από 5 αστέρια, 13 Νοεμβρίου 2026"
			>
				{#snippet body()}
					<span class="flex flex-row items-center gap-2">
						<Rating variant="stars" starSize="xs" value={5} />
						<span class="text-body-sm font-semibold">13 Νοεμβρίου 2026</span>
					</span>
				{/snippet}
			</LinkCard>
		</div>
	{/snippet}
</Story>
