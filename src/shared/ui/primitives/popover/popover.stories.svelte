<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import {
		Popover,
		PopoverTrigger,
		PopoverContent,
		type PopoverSize
	} from '$shared/ui/primitives/popover';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const placements = ['top', 'bottom', 'left', 'right'] as const;
	const sizes: PopoverSize[] = ['sm', 'md', 'lg'];

	// The application's popover (`molecules/popover`): «Λεπτομέρειες» opens «Διαστάσεις». It fades in and grows from
	// 95 % on Airbnb's 0.25 s curve, the reverse on leaving (U-09.8), whatever the motion setting (U-12.1).
	const { Story } = defineMeta({
		title: 'Primitives/Popover',
		component: Popover,
		tags: ['autodocs']
	});
</script>

<Story
	name="Playground"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Λεπτομέρειες' }));
		await expect(await screen.findByText('Ορίστε τις διαστάσεις του στοιχείου εδώ.')).toBeVisible();
	}}
>
	{#snippet template()}
		<Popover>
			<PopoverTrigger class={buttonClasses()}>Λεπτομέρειες</PopoverTrigger>
			<PopoverContent>
				<div class="flex flex-col gap-1.5">
					<p class="text-title-sm font-semibold text-foreground">Διαστάσεις</p>
					<p class="text-body-sm text-muted-foreground">Ορίστε τις διαστάσεις του στοιχείου εδώ.</p>
				</div>
			</PopoverContent>
		</Popover>
	{/snippet}
</Story>

<Story name="Placements">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each placements as placement (placement)}
				<Popover>
					<PopoverTrigger class={buttonClasses()}>{placement}</PopoverTrigger>
					<PopoverContent {placement}>
						<p class="text-body-sm text-muted-foreground">Θέση {placement}.</p>
					</PopoverContent>
				</Popover>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each sizes as size (size)}
				<Popover>
					<PopoverTrigger class={buttonClasses()}>{size}</PopoverTrigger>
					<PopoverContent {size}>
						<p class="text-body-sm text-muted-foreground">Το {size} ορίζει το πλάτος.</p>
					</PopoverContent>
				</Popover>
			{/each}
		</div>
	{/snippet}
</Story>
