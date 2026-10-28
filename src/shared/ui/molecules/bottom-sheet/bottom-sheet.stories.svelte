<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BottomSheet, BottomSheetTitle } from '$shared/ui/molecules/bottom-sheet';
	import { Button } from '$shared/ui/primitives/button';

	const countries = ['Ελλάδα', 'Κύπρος', 'Γερμανία', 'Ιταλία', 'Γαλλία', 'Ισπανία', 'Ολλανδία'];

	// The application's sheet (`molecules/bottom-sheet`), opened by «Άνοιγμα» (the web binds `open` for its `present()`
	// / `dismiss()`; the page behind it reopens it). It rises from the bottom and goes back down on 250 ms `expoOut`
	// (gorhom's Android curve, near its iOS spring) while the backdrop fades (U-09.8, in CSS whatever the motion setting, U-12.1).
	const { Story } = defineMeta({
		title: 'Molecules/BottomSheet',
		component: BottomSheet,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 640 } } }
	});
</script>

<script lang="ts">
	let playground = $state(false);
	let fixed = $state(false);
	let long = $state(false);
	let locked = $state(false);
</script>

{#snippet opener(label: string, open: () => void)}
	<div class="p-card"><Button {label} onclick={open} /></div>
{/snippet}

<Story name="Playground">
	{#snippet template()}
		{@render opener('Άνοιγμα', () => (playground = true))}
		<BottomSheet bind:open={playground}>
			<div class="flex flex-col gap-3 px-4 pt-2 pb-section">
				<BottomSheetTitle class="text-title-sm">Τίτλος φύλλου</BottomSheetTitle>
				<p class="text-body-md text-muted-foreground">Φύλλο που ανοίγει από κάτω με το κουμπί.</p>
				<Button label="Κλείσιμο" tone="ghost" onclick={() => (playground = false)} />
			</div>
		</BottomSheet>
	{/snippet}
</Story>

<Story name="Fixed Snap Points">
	{#snippet template()}
		{@render opener('Άνοιγμα (50%)', () => (fixed = true))}
		<BottomSheet bind:open={fixed} snapPoints={['50%']}>
			<div class="flex flex-col gap-3 px-4 pt-2 pb-section">
				<BottomSheetTitle class="text-title-sm">Σταθερό ύψος</BottomSheetTitle>
				<p class="text-body-md text-muted-foreground">Σταθερό στο 50% του ύψους της οθόνης.</p>
			</div>
		</BottomSheet>
	{/snippet}
</Story>

<!-- A sheet whose body is a list longer than the screen: it scrolls inside the sheet (`scrollable`). -->
<Story name="Scrollable">
	{#snippet template()}
		{@render opener('Άνοιγμα', () => (long = true))}
		<BottomSheet bind:open={long} scrollable aria-label="Χώρες">
			<ul class="flex flex-col px-5">
				{#each [...countries, ...countries] as country, index (index)}
					<li
						class="flex min-h-row items-center border-b border-border/60 text-body-lg text-foreground"
					>
						{country}
					</li>
				{/each}
			</ul>
		</BottomSheet>
	{/snippet}
</Story>

<!-- A sheet only its own button closes: no backdrop press, no swipe down (and on the web no Escape). -->
<Story name="Without Backdrop Dismiss">
	{#snippet template()}
		{@render opener('Άνοιγμα', () => (locked = true))}
		<BottomSheet bind:open={locked} dismissOnBackdropPress={false}>
			<div class="flex flex-col gap-3 px-4 pt-2 pb-section">
				<BottomSheetTitle class="text-title-sm">Αποστολή σε εξέλιξη</BottomSheetTitle>
				<p class="text-body-md text-muted-foreground">Ούτε το φόντο ούτε το σύρσιμο το κλείνουν.</p>
				<Button label="Κλείσιμο" onclick={() => (locked = false)} />
			</div>
		</BottomSheet>
	{/snippet}
</Story>
