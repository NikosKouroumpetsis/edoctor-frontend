<script lang="ts">
	import { HoverCard, HoverCardTrigger, HoverCardContent, type HoverCardSize } from './index';

	let { size = 'default' }: { size?: HoverCardSize } = $props();
</script>

<HoverCard openDelay={0} closeDelay={0}>
	<HoverCardTrigger href="#">@maria</HoverCardTrigger>
	<HoverCardContent {size}>
		<p>Dr. Maria Alexiou — Cardiologist</p>
	</HoverCardContent>
</HoverCard>
