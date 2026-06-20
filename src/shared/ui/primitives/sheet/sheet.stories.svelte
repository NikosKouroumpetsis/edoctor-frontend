<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$shared/ui/primitives/sheet';
	import { buttonVariants } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Primitives/Sheet',
		component: Sheet,
		tags: ['autodocs']
	});
</script>

{#snippet sheetExample(side: 'top' | 'bottom' | 'left' | 'right', label: string)}
	<Sheet>
		<SheetTrigger class={buttonVariants({ variant: 'outline' })}>{label}</SheetTrigger>
		<SheetContent {side}>
			<SheetHeader>
				<SheetTitle>Filters</SheetTitle>
				<SheetDescription>Narrow down the doctor search.</SheetDescription>
			</SheetHeader>
		</SheetContent>
	</Sheet>
{/snippet}

<Story name="Right">
	{#snippet template()}
		{@render sheetExample('right', 'Open right')}
	{/snippet}
</Story>

<Story name="Left">
	{#snippet template()}
		{@render sheetExample('left', 'Open left')}
	{/snippet}
</Story>

<Story name="Top">
	{#snippet template()}
		{@render sheetExample('top', 'Open top')}
	{/snippet}
</Story>

<Story name="Bottom">
	{#snippet template()}
		{@render sheetExample('bottom', 'Open bottom')}
	{/snippet}
</Story>
