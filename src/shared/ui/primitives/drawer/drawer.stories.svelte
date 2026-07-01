<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Drawer,
		DrawerTrigger,
		DrawerContent,
		DrawerHeader,
		DrawerFooter,
		DrawerTitle,
		DrawerDescription,
		DrawerClose
	} from '$shared/ui/primitives/drawer';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Drawer',
		component: Drawer,
		tags: ['autodocs']
	});
</script>

{#snippet example(direction: 'top' | 'bottom' | 'left' | 'right', label: string)}
	<Drawer>
		<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>{label}</DrawerTrigger>
		<DrawerContent {direction}>
			<DrawerHeader>
				<DrawerTitle>Book an appointment</DrawerTitle>
				<DrawerDescription>
					Drag the handle (or this panel) toward the edge to dismiss.
				</DrawerDescription>
			</DrawerHeader>
			<DrawerFooter>
				<DrawerClose class={buttonVariants({ variant: 'default' })}>Confirm</DrawerClose>
				<DrawerClose class={buttonVariants({ variant: 'ghost' })}>Cancel</DrawerClose>
			</DrawerFooter>
		</DrawerContent>
	</Drawer>
{/snippet}

<Story name="Bottom">
	{#snippet template()}
		{@render example('bottom', 'Open bottom')}
	{/snippet}
</Story>

<Story name="Top">
	{#snippet template()}
		{@render example('top', 'Open top')}
	{/snippet}
</Story>

<Story name="Left">
	{#snippet template()}
		{@render example('left', 'Open left')}
	{/snippet}
</Story>

<Story name="Right">
	{#snippet template()}
		{@render example('right', 'Open right')}
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each ['sm', 'default', 'lg'] as const as size (size)}
				<Drawer>
					<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>Bottom {size}</DrawerTrigger
					>
					<DrawerContent direction="bottom" {size}>
						<DrawerHeader>
							<DrawerTitle>Size {size}</DrawerTitle>
							<DrawerDescription
								>The {size} panel sets the bottom drawer height cap.</DrawerDescription
							>
						</DrawerHeader>
					</DrawerContent>
				</Drawer>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Scrollable content">
	{#snippet template()}
		<Drawer>
			<DrawerTrigger class={buttonVariants({ variant: 'outline' })}>Open long drawer</DrawerTrigger>
			<DrawerContent direction="bottom">
				<DrawerHeader>
					<DrawerTitle>Terms</DrawerTitle>
					<DrawerDescription>Scroll the list; drag from the top to dismiss.</DrawerDescription>
				</DrawerHeader>
				<div class="min-h-0 flex-1 overflow-y-auto pr-2">
					{#each Array.from({ length: 30 }, (_, i) => i + 1) as n (n)}
						<p class="border-b border-border py-2 text-sm">List item {n}</p>
					{/each}
				</div>
			</DrawerContent>
		</Drawer>
	{/snippet}
</Story>
