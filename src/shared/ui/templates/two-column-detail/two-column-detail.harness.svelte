<script lang="ts">
	import { TwoColumnDetail, type TwoColumnAsidePosition } from './index';

	let {
		asidePosition,
		stickyAside
	}: { asidePosition?: TwoColumnAsidePosition; stickyAside?: boolean } = $props();
</script>

<TwoColumnDetail {asidePosition} {stickyAside} data-testid="detail">
	{#snippet aside()}
		<p>Πλευρική</p>
	{/snippet}
	<p>Κύρια</p>
</TwoColumnDetail>
