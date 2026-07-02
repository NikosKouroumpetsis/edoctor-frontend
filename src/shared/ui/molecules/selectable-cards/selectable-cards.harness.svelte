<script lang="ts">
	import { SelectableCards, SelectableCard } from './index';

	let {
		type = 'single',
		value = $bindable(),
		disabled = false
	}: { type?: 'single' | 'multiple'; value?: string | string[]; disabled?: boolean } = $props();
</script>

<SelectableCards {type} bind:value {disabled} label="Choose a space">
	<SelectableCard value="alpha" title="Alpha" description="First option" />
	<SelectableCard value="beta" title="Beta" description="Second option" />
	<SelectableCard value="gamma" title="Gamma" description="Third option" />
</SelectableCards>
