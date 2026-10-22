<script lang="ts">
	import { Popover, PopoverTrigger, PopoverContent, type PopoverSize } from './index';

	let { open = $bindable(false), size = 'default' }: { open?: boolean; size?: PopoverSize } =
		$props();
</script>

<div>
	<Popover bind:open>
		<PopoverTrigger>Open popover</PopoverTrigger>
		<PopoverContent {size}>
			<p>Popover body</p>
			<button type="button" class="min-h-touch min-w-touch">Inner action</button>
		</PopoverContent>
	</Popover>
	<button type="button" class="min-h-touch min-w-touch" data-testid="outside">Outside</button>
</div>
