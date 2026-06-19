<script lang="ts">
	import { Toggle } from '$shared/ui/primitives/toggle';
	import { ToggleGroup, ToggleGroupItem } from '$shared/ui/primitives/toggle-group';
	import BoldIcon from '~icons/lucide/bold';
	import ItalicIcon from '~icons/lucide/italic';
	import UnderlineIcon from '~icons/lucide/underline';
	import AlignLeftIcon from '~icons/lucide/align-left';
	import AlignCenterIcon from '~icons/lucide/align-center';
	import AlignRightIcon from '~icons/lucide/align-right';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let bold = $state(false);
	let align = $state('left');
	let formats = $state<string[]>(['bold']);
</script>

<DemoSection
	id="toggles"
	title="Toggle · Toggle group"
	description="Two-state buttons and grouped toggles."
>
	<DemoRow label="Toggle (pressed: {bold})">
		<Toggle bind:pressed={bold} aria-label="Bold"><BoldIcon /></Toggle>
		<Toggle variant="outline" aria-label="Italic"><ItalicIcon /></Toggle>
	</DemoRow>

	<DemoRow label="Single (align: {align})">
		<ToggleGroup type="single" bind:value={align} variant="outline">
			<ToggleGroupItem value="left" aria-label="Align left"><AlignLeftIcon /></ToggleGroupItem>
			<ToggleGroupItem value="center" aria-label="Align center"><AlignCenterIcon /></ToggleGroupItem
			>
			<ToggleGroupItem value="right" aria-label="Align right"><AlignRightIcon /></ToggleGroupItem>
		</ToggleGroup>
	</DemoRow>

	<DemoRow label="Multiple (formats: {formats.join(', ') || 'none'})">
		<ToggleGroup type="multiple" bind:value={formats} variant="outline">
			<ToggleGroupItem value="bold" aria-label="Bold"><BoldIcon /></ToggleGroupItem>
			<ToggleGroupItem value="italic" aria-label="Italic"><ItalicIcon /></ToggleGroupItem>
			<ToggleGroupItem value="underline" aria-label="Underline"><UnderlineIcon /></ToggleGroupItem>
		</ToggleGroup>
	</DemoRow>
</DemoSection>
