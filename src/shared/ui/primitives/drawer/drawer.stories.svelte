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
		DrawerClose,
		type DrawerDirection,
		type DrawerSize
	} from '$shared/ui/primitives/drawer';
	import { buttonClasses } from '$shared/ui/primitives/button';

	const sizes: DrawerSize[] = ['sm', 'md', 'lg'];

	// Web only (the application has no drawer): it rises from its edge and goes back to it on the bottom sheet's motion
	// (gorhom's 250 ms `out(exp)`, U-09.8), the backdrop fades (CSS, whatever the motion setting, U-12.1).
	const { Story } = defineMeta({
		title: 'Primitives/Drawer',
		component: Drawer,
		tags: ['autodocs']
	});
</script>

{#snippet example(direction: DrawerDirection, label: string)}
	<Drawer>
		<DrawerTrigger class={buttonClasses({ tone: 'outline' })}>{label}</DrawerTrigger>
		<DrawerContent {direction}>
			<DrawerHeader>
				<DrawerTitle>Κλείστε ραντεβού</DrawerTitle>
				<DrawerDescription
					>Σύρετε τη λαβή (ή το πάνελ) προς την άκρη για να κλείσει.</DrawerDescription
				>
			</DrawerHeader>
			<DrawerFooter>
				<DrawerClose class={buttonClasses()}>Επιβεβαίωση</DrawerClose>
				<DrawerClose class={buttonClasses({ tone: 'ghost' })}>Άκυρο</DrawerClose>
			</DrawerFooter>
		</DrawerContent>
	</Drawer>
{/snippet}

<Story name="Bottom">
	{#snippet template()}{@render example('bottom', 'Άνοιγμα κάτω')}{/snippet}
</Story>

<Story name="Top">
	{#snippet template()}{@render example('top', 'Άνοιγμα πάνω')}{/snippet}
</Story>

<Story name="Left">
	{#snippet template()}{@render example('left', 'Άνοιγμα αριστερά')}{/snippet}
</Story>

<Story name="Right">
	{#snippet template()}{@render example('right', 'Άνοιγμα δεξιά')}{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap gap-3">
			{#each sizes as size (size)}
				<Drawer>
					<DrawerTrigger class={buttonClasses({ tone: 'outline' })}>Κάτω {size}</DrawerTrigger>
					<DrawerContent direction="bottom" {size}>
						<DrawerHeader>
							<DrawerTitle>Μέγεθος {size}</DrawerTitle>
							<DrawerDescription>Το {size} ορίζει το μέγιστο ύψος.</DrawerDescription>
						</DrawerHeader>
					</DrawerContent>
				</Drawer>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Scrollable Content">
	{#snippet template()}
		<Drawer>
			<DrawerTrigger class={buttonClasses({ tone: 'outline' })}
				>Άνοιγμα μεγάλης λίστας</DrawerTrigger
			>
			<DrawerContent direction="bottom">
				<DrawerHeader>
					<DrawerTitle>Όροι</DrawerTitle>
					<DrawerDescription>Κυλήστε τη λίστα· σύρετε από πάνω για να κλείσει.</DrawerDescription>
				</DrawerHeader>
				<div class="min-h-0 flex-1 overflow-y-auto pr-2">
					{#each Array.from({ length: 30 }, (_, i) => i + 1) as n (n)}
						<p class="border-b border-border py-2 text-body-sm">Στοιχείο {n}</p>
					{/each}
				</div>
			</DrawerContent>
		</Drawer>
	{/snippet}
</Story>
