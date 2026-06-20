<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$shared/ui/primitives/tooltip';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Tooltip',
		component: Tooltip,
		tags: ['autodocs']
	});
</script>

<Story name="Default (focus to show)">
	{#snippet template()}
		<Tooltip openDelay={0} closeDelay={0}>
			<TooltipTrigger class={buttonVariants({ variant: 'outline' })}>Hover or focus</TooltipTrigger>
			<TooltipContent>Books the next available slot.</TooltipContent>
		</Tooltip>
	{/snippet}
</Story>

<Story name="Placements">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each ['top', 'bottom', 'left', 'right'] as const as placement (placement)}
				<Tooltip openDelay={0} closeDelay={0}>
					<TooltipTrigger class={buttonVariants({ variant: 'outline' })}>{placement}</TooltipTrigger
					>
					<TooltipContent {placement}>Placed {placement}.</TooltipContent>
				</Tooltip>
			{/each}
		</div>
	{/snippet}
</Story>
