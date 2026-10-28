<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription,
		SheetClose,
		type SheetSide,
		type SheetSize
	} from '$shared/ui/primitives/sheet';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const sizes: SheetSize[] = ['sm', 'md', 'lg'];

	// The application's sheet (`molecules/sheet`): «Άνοιγμα (side)» opens «Φίλτρα». It slides in from its side and out
	// to it while the backdrop fades (U-09.8, whatever the motion setting, U-12.1); the focus lands on the panel (U-09.7).
	const { Story } = defineMeta({
		title: 'Primitives/Sheet',
		component: Sheet,
		tags: ['autodocs']
	});
</script>

{#snippet sheet(
	side: SheetSide,
	size: SheetSize | undefined = undefined,
	label = `Άνοιγμα (${side})`,
	description = 'Περιορίστε τα αποτελέσματα αναζήτησης.'
)}
	<Sheet>
		<SheetTrigger class={buttonClasses()}>{label}</SheetTrigger>
		<SheetContent {side} {size} closeLabel="Κλείσιμο">
			<SheetHeader>
				<SheetTitle>Φίλτρα</SheetTitle>
				<SheetDescription>{description}</SheetDescription>
			</SheetHeader>
			<p class="text-body-md text-muted-foreground">Περιεχόμενο φύλλου.</p>
			<SheetClose class={buttonClasses({ tone: 'ghost' })}>Κλείσιμο</SheetClose>
		</SheetContent>
	</Sheet>
{/snippet}

<Story name="Playground">
	{#snippet template()}{@render sheet('right')}{/snippet}
</Story>

<Story name="Left">
	{#snippet template()}{@render sheet('left')}{/snippet}
</Story>

<Story name="Top">
	{#snippet template()}{@render sheet('top')}{/snippet}
</Story>

<Story name="Bottom">
	{#snippet template()}{@render sheet('bottom')}{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each sizes as size (size)}
				{@render sheet('right', size, `Δεξιά ${size}`, `Το ${size} ορίζει το πλάτος του φύλλου.`)}
			{/each}
		</div>
	{/snippet}
</Story>
