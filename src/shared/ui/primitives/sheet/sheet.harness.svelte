<script lang="ts">
	import { Sheet, SheetTrigger, SheetContent, SheetTitle } from './index';

	let { side = 'right' }: { side?: 'top' | 'bottom' | 'left' | 'right' } = $props();
</script>

<Sheet>
	<SheetTrigger>Open sheet</SheetTrigger>
	<SheetContent {side}>
		<SheetTitle>Filters</SheetTitle>
		<p>Sheet body</p>
	</SheetContent>
</Sheet>
