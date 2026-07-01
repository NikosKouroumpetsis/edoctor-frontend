<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import { Popover, PopoverTrigger, PopoverContent } from '$shared/ui/primitives/popover';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Popover',
		component: Popover,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<Popover>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>Open popover</PopoverTrigger>
			<PopoverContent class="w-64">
				<p class="text-body-sm">Set your notification preferences here.</p>
			</PopoverContent>
		</Popover>
	{/snippet}
</Story>

<Story name="Placement variants">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each ['top', 'bottom', 'left', 'right'] as const as placement (placement)}
				<Popover>
					<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>{placement}</PopoverTrigger
					>
					<PopoverContent {placement} class="w-40">
						<p class="text-body-sm">Placed {placement}.</p>
					</PopoverContent>
				</Popover>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each ['sm', 'default', 'lg'] as const as size (size)}
				<Popover>
					<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>{size}</PopoverTrigger>
					<PopoverContent {size}>
						<p class="text-body-sm">The {size} popover sets the panel width.</p>
					</PopoverContent>
				</Popover>
			{/each}
		</div>
	{/snippet}
</Story>

<Story
	name="Opened"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Open popover' }));
		await expect(await screen.findByText('Set your notification preferences here.')).toBeVisible();
	}}
>
	{#snippet template()}
		<Popover>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>Open popover</PopoverTrigger>
			<PopoverContent class="w-64">
				<p class="text-body-sm">Set your notification preferences here.</p>
			</PopoverContent>
		</Popover>
	{/snippet}
</Story>
