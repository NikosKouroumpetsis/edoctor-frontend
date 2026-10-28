<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { CarouselSection } from '$shared/ui/organisms/carousel-section';

	const cards = ['Κάρτα 1', 'Κάρτα 2', 'Κάρτα 3'];
	const noop = () => {};

	// The application's meta (`organisms/carousel-section`): «Δημοφιλείς γιατροί» / «Στην Αθήνα», the static circle.
	const { Story } = defineMeta({
		title: 'Organisms/CarouselSection',
		component: CarouselSection,
		tags: ['autodocs'],
		args: {
			title: 'Δημοφιλείς γιατροί',
			subtitle: 'Στην Αθήνα',
			trailing: { icon: 'arrow-forward' }
		},
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<CarouselSection
		title={args.title as string}
		subtitle={args.subtitle as string | undefined}
		trailing={args.trailing as { icon: 'arrow-forward' } | undefined}
	>
		{#each cards as label (label)}
			<div class="flex size-placeholder-xl items-center justify-center rounded-xl bg-muted">
				<p class="text-body-md text-foreground">{label}</p>
			</div>
		{/each}
	</CarouselSection>
{/snippet}

<Story name="Playground" />

<Story name="With Pressable Trailing">
	{#snippet template()}
		<CarouselSection
			title="Δημοφιλείς γιατροί"
			subtitle="Στην Αθήνα"
			trailing={{ icon: 'arrow-forward', onclick: noop, label: 'Δείτε όλα' }}
		>
			{#each cards as label (label)}
				<div class="flex size-placeholder-xl items-center justify-center rounded-xl bg-muted">
					<p class="text-body-md text-foreground">{label}</p>
				</div>
			{/each}
		</CarouselSection>
	{/snippet}
</Story>

<Story name="No Trailing" args={{ trailing: undefined }} />

<Story name="No Subtitle" args={{ subtitle: undefined }} />
