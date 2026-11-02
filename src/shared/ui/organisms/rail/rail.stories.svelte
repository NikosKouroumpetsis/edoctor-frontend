<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container } from '$shared/ui/molecules/container';
	import { RAIL_CARDS_PER_VIEW, Rail } from '$shared/ui/organisms/rail';

	const cards = ['Κάρτα 1', 'Κάρτα 2', 'Κάρτα 3', 'Κάρτα 4'];
	// The web's own examples (arrows, bleed) need a row long enough to scroll on a laptop.
	const manyCards = Array.from({ length: 10 }, (_, index) => `Κάρτα ${index + 1}`);
	const scrollLabels = { previous: 'Προηγούμενα', next: 'Επόμενα' };
	const noop = () => {};

	// The application's meta (`organisms/rail`): «Δημοφιλή» / «Κοντά σας», the static circle, the `gap` row.
	const { Story } = defineMeta({
		title: 'Organisms/Rail',
		component: Rail,
		tags: ['autodocs'],
		args: { title: 'Δημοφιλή', subtitle: 'Κοντά σας', trailing: { icon: 'arrow-forward' } },
		argTypes: {
			variant: { control: 'select', options: ['gap', 'separated'] },
			endPadding: { control: 'select', options: ['sm', 'md'] }
		}
	});
</script>

{#snippet card(label: string)}
	<div class="flex size-placeholder-xl items-center justify-center rounded-xl bg-muted">
		<p class="text-body-md text-foreground">{label}</p>
	</div>
{/snippet}

<!-- The application's rail (U-20): the static 32 soft circle right after the title. -->
<Story name="Gap">
	{#snippet template(args)}
		<Rail title={args.title} subtitle={args.subtitle} trailing={args.trailing}>
			{#each cards as label (label)}{@render card(label)}{/each}
		</Rail>
	{/snippet}
</Story>

<!-- The home's articles rail: the circle opens the full list. -->
<Story name="Gap With Pressable Trailing">
	{#snippet template(args)}
		<Rail
			title={args.title}
			subtitle={args.subtitle}
			trailing={{ label: 'Όλα', icon: 'arrow-forward', onclick: noop }}
		>
			{#each cards as label (label)}{@render card(label)}{/each}
		</Rail>
	{/snippet}
</Story>

<Story name="Gap Without Trailing">
	{#snippet template(args)}
		<Rail title={args.title} subtitle={args.subtitle}>
			{#each cards as label (label)}{@render card(label)}{/each}
		</Rail>
	{/snippet}
</Story>

<Story name="Gap Without Subtitle">
	{#snippet template(args)}
		<Rail title={args.title} trailing={args.trailing}>
			{#each cards as label (label)}{@render card(label)}{/each}
		</Rail>
	{/snippet}
</Story>

<!-- The profile's reviews: a hairline between cells, no header of its own. -->
<Story name="Separated">
	{#snippet template()}
		<Rail variant="separated" items={cards} keyExtractor={(label) => label} renderItem={card} />
	{/snippet}
</Story>

<!-- The profile's articles: the same, 18 after the last card. -->
<Story name="Separated Wide End">
	{#snippet template()}
		<Rail
			variant="separated"
			endPadding="md"
			items={cards}
			keyExtractor={(label) => label}
			renderItem={card}
		/>
	{/snippet}
</Story>

<Story name="Separated With Title">
	{#snippet template(args)}
		<Rail
			title={args.title}
			subtitle={args.subtitle}
			variant="separated"
			items={cards}
			keyExtractor={(label) => label}
			renderItem={card}
		/>
	{/snippet}
</Story>

<!-- Web only (a pointer's screen): ‹ › from 1128 (z1128 / z1440), off until measured, then at each end. -->
<Story name="Scroll Controls" parameters={{ layout: 'fullscreen' }}>
	{#snippet template(args)}
		<Container class="py-section">
			<Rail title={args.title} subtitle={args.subtitle} trailing={args.trailing} {scrollLabels}>
				{#each manyCards as label (label)}{@render card(label)}{/each}
			</Rail>
		</Container>
	{/snippet}
</Story>

<Story name="Scroll Controls From Tablet" parameters={{ layout: 'fullscreen' }}>
	{#snippet template(args)}
		<Container class="py-section">
			<Rail title={args.title} subtitle={args.subtitle} controlsFrom="tablet" {scrollLabels}>
				{#each manyCards as label (label)}{@render card(label)}{/each}
			</Rail>
		</Container>
	{/snippet}
</Story>

<!-- Web only (the CSS gutter of `Container`): Airbnb's phone peek, the row runs to the screen edge and snaps its
     cards to the gutter. -->
<Story name="Bleed Into Gutters" parameters={{ layout: 'fullscreen' }}>
	{#snippet template(args)}
		<Container class="py-section">
			<Rail title={args.title} subtitle={args.subtitle} bleed {scrollLabels}>
				{#each manyCards as label (label)}{@render card(label)}{/each}
			</Rail>
		</Container>
	{/snippet}
</Story>

<!-- Web (U-20, Airbnb's home): the circle right after the title opens the row's results, the arrows stay at the end
     from 744, faint at an end. -->
<Story name="Arrow Beside The Title" parameters={{ layout: 'fullscreen' }}>
	{#snippet template(args)}
		<Container class="py-section">
			<Rail
				title={args.title}
				trailing={{ icon: 'arrow-forward', label: 'Δείτε όλους', href: '#all' }}
				controlsFrom="tablet"
				{scrollLabels}
			>
				{#each manyCards as label (label)}{@render card(label)}{/each}
			</Rail>
		</Container>
	{/snippet}
</Story>

<!-- The application's `CarouselSection` circle: the 40 card circle at the header's end (`trailingAt="end"`). -->
<Story name="Arrow At The End">
	{#snippet template(args)}
		<Rail title={args.title} subtitle={args.subtitle} trailing={args.trailing} trailingAt="end">
			{#each cards as label (label)}{@render card(label)}{/each}
		</Rail>
	{/snippet}
</Story>

<!-- The application's «HomeRow» (U-20, `perView={RAIL_CARDS_PER_VIEW}`): ~2.3 cards on the phone (the row runs
     into the gutters), 4 · 5 · 6 · 7 from 744 · 950 · 1128 · 1440 — 12 apart. -->
<Story name="Home Row" parameters={{ layout: 'fullscreen' }}>
	{#snippet template(args)}
		<Container class="py-section">
			<Rail
				title={args.title}
				trailing={{ icon: 'arrow-forward', label: 'Δείτε όλους', href: '#all' }}
				controlsFrom="tablet"
				perView={RAIL_CARDS_PER_VIEW}
				{scrollLabels}
			>
				{#each manyCards as label (label)}
					<div>
						<div class="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
							<p class="text-body-md text-foreground">{label}</p>
						</div>
					</div>
				{/each}
			</Rail>
		</Container>
	{/snippet}
</Story>
