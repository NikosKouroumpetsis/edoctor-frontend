<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$shared/ui/primitives/tooltip';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const placements = ['top', 'bottom', 'left', 'right'] as const;

	// The application's tooltip (`molecules/tooltip`, its long press; here the pointer or the focus): the ghost
	// «Πληροφορίες» and the neutral hint of both sides (R7-3). It fades in and grows from 90 % (U-09.8).
	const { Story } = defineMeta({
		title: 'Primitives/Tooltip',
		component: Tooltip,
		tags: ['autodocs']
	});
</script>

<Story name="Playground">
	{#snippet template()}
		<Tooltip openDelay={0} closeDelay={0}>
			<TooltipTrigger class={buttonClasses({ tone: 'ghost' })}>Πληροφορίες</TooltipTrigger>
			<TooltipContent>Κλείνει την πρώτη διαθέσιμη ώρα.</TooltipContent>
		</Tooltip>
	{/snippet}
</Story>

<Story name="Placements">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each placements as placement (placement)}
				<Tooltip openDelay={0} closeDelay={0}>
					<TooltipTrigger class={buttonClasses({ tone: 'ghost' })}>{placement}</TooltipTrigger>
					<TooltipContent {placement}>Θέση {placement}.</TooltipContent>
				</Tooltip>
			{/each}
		</div>
	{/snippet}
</Story>
