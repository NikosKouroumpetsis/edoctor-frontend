<script lang="ts">
	import {
		Sheet,
		SheetTrigger,
		SheetContent,
		SheetTitle,
		type SheetSide,
		type SheetSize
	} from './index';

	let { side = 'right', size }: { side?: SheetSide; size?: SheetSize } = $props();
</script>

<Sheet>
	<SheetTrigger>Open sheet</SheetTrigger>
	<SheetContent {side} {size} closeLabel="Close">
		<SheetTitle>Filters</SheetTitle>
		<p>Sheet body</p>
	</SheetContent>
</Sheet>
