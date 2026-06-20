<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ToggleGroup, ToggleGroupItem } from '$shared/ui/primitives/toggle-group';
	import AlignLeftIcon from '~icons/lucide/align-left';
	import AlignCenterIcon from '~icons/lucide/align-center';
	import AlignRightIcon from '~icons/lucide/align-right';

	const { Story } = defineMeta({
		title: 'Primitives/Toggle group',
		component: ToggleGroup,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let single = $state<string | string[]>('center');
	let multiple = $state<string | string[]>(['left']);
	let vertical = $state<string | string[]>('center');
</script>

<Story name="Single">
	{#snippet template()}
		<ToggleGroup type="single" bind:value={single} variant="outline">
			<ToggleGroupItem value="left" aria-label="Align left"><AlignLeftIcon /></ToggleGroupItem>
			<ToggleGroupItem value="center" aria-label="Align center"><AlignCenterIcon /></ToggleGroupItem
			>
			<ToggleGroupItem value="right" aria-label="Align right"><AlignRightIcon /></ToggleGroupItem>
		</ToggleGroup>
	{/snippet}
</Story>

<Story name="Multiple">
	{#snippet template()}
		<ToggleGroup type="multiple" bind:value={multiple} variant="outline">
			<ToggleGroupItem value="left" aria-label="Align left"><AlignLeftIcon /></ToggleGroupItem>
			<ToggleGroupItem value="center" aria-label="Align center"><AlignCenterIcon /></ToggleGroupItem
			>
			<ToggleGroupItem value="right" aria-label="Align right"><AlignRightIcon /></ToggleGroupItem>
		</ToggleGroup>
	{/snippet}
</Story>

<Story name="Vertical">
	{#snippet template()}
		<ToggleGroup type="single" bind:value={vertical} orientation="vertical" variant="outline">
			<ToggleGroupItem value="left" aria-label="Align left"><AlignLeftIcon /></ToggleGroupItem>
			<ToggleGroupItem value="center" aria-label="Align center"><AlignCenterIcon /></ToggleGroupItem
			>
			<ToggleGroupItem value="right" aria-label="Align right"><AlignRightIcon /></ToggleGroupItem>
		</ToggleGroup>
	{/snippet}
</Story>
