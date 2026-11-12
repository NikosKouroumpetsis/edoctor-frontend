<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StarInput } from '$shared/ui/molecules/star-input';

	// U-138.2 (D-W4-27): a press gives a whole star, the same star again half; the arrows half a star, one slider a row.
	const { Story } = defineMeta({
		title: 'Molecules/StarInput',
		component: StarInput,
		tags: ['autodocs']
	});

	const spoken = (value: number) =>
		value === 0 ? 'Χωρίς βαθμό' : `${String(value / 2).replace('.', ',')} στα 5`;
	const shown = (value: number) => (value === 0 ? '' : String(value / 2).replace('.', ','));
</script>

<script lang="ts">
	let rows = $state([
		{ name: 'Σε βάθος', value: 9 },
		{ name: 'Εμπιστοσύνη', value: 8 },
		{ name: 'Εξειδίκευση', value: 0 }
	]);
</script>

<Story name="Empty">
	{#snippet template()}
		<StarInput aria-label="Σε βάθος" valueText={spoken} />
	{/snippet}
</Story>

<Story name="Half A Star">
	{#snippet template()}
		<StarInput aria-label="Σε βάθος" value={7} valueText={spoken} />
	{/snippet}
</Story>

<!-- A row of a form: the name, the stars (their first glyph under the words: `-ml-2`, the 48 box less the 32 star), the value beside them. -->
<Story name="Rows">
	{#snippet template()}
		<div class="flex flex-col">
			{#each rows as row (row.name)}
				<div class="flex flex-col gap-1 border-t border-border/60 py-3">
					<span class="text-body-lg font-semibold text-foreground">{row.name}</span>
					<div class="flex flex-row items-center">
						<StarInput
							bind:value={row.value}
							aria-label={row.name}
							valueText={spoken}
							class="-ml-2"
						/>
						<span class="ml-2 min-w-control-xs text-body-lg font-semibold text-foreground"
							>{shown(row.value)}</span
						>
					</div>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<StarInput aria-label="Σε βάθος" value={6} valueText={spoken} disabled />
	{/snippet}
</Story>
