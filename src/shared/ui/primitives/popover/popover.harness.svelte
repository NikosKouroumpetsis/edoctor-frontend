<script lang="ts">
	import { Popover, PopoverTrigger, PopoverContent } from './index';

	let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<div>
	<Popover bind:open>
		<PopoverTrigger>Open popover</PopoverTrigger>
		<PopoverContent>
			<p>Popover body</p>
			<button type="button">Inner action</button>
		</PopoverContent>
	</Popover>
	<button type="button" data-testid="outside">Outside</button>
</div>
