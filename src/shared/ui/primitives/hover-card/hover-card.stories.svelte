<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { HoverCard, HoverCardTrigger, HoverCardContent } from '$shared/ui/primitives/hover-card';

	const { Story } = defineMeta({
		title: 'Primitives/Hover card',
		component: HoverCard,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<HoverCard openDelay={0} closeDelay={0}>
			<HoverCardTrigger
				href="#"
				class="font-medium text-primary underline-offset-4 hover:underline"
			>
				@maria
			</HoverCardTrigger>
			<HoverCardContent class="w-64">
				<p class="text-body-sm font-medium">Dr. Maria Alexiou</p>
				<p class="text-body-sm text-muted-foreground">Cardiologist — Athens</p>
			</HoverCardContent>
		</HoverCard>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-6">
			{#each ['sm', 'default', 'lg'] as const as size (size)}
				<HoverCard openDelay={0} closeDelay={0}>
					<HoverCardTrigger
						href="#"
						class="font-medium text-primary underline-offset-4 hover:underline"
					>
						@maria ({size})
					</HoverCardTrigger>
					<HoverCardContent {size}>
						<p class="text-body-sm font-medium">Dr. Maria Alexiou</p>
						<p class="text-body-sm text-muted-foreground">The {size} card sets the width.</p>
					</HoverCardContent>
				</HoverCard>
			{/each}
		</div>
	{/snippet}
</Story>
