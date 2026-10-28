<script lang="ts">
	import { ToggleGroup, ToggleGroupItem } from './index';

	let {
		type = 'single',
		orientation = 'horizontal',
		value = $bindable()
	}: {
		type?: 'single' | 'multiple';
		orientation?: 'horizontal' | 'vertical';
		value?: string | string[];
	} = $props();
</script>

<ToggleGroup {type} {orientation} bind:value variant="outline">
	<ToggleGroupItem value="left" aria-label="Left">L</ToggleGroupItem>
	<ToggleGroupItem value="center" aria-label="Center">C</ToggleGroupItem>
	<ToggleGroupItem value="right" aria-label="Right">R</ToggleGroupItem>
</ToggleGroup>
