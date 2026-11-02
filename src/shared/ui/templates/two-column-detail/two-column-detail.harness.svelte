<script lang="ts">
	import { TwoColumnDetail, type TwoColumnAsidePosition, type TwoColumnFrom } from './index';

	let {
		asidePosition,
		stickyAside,
		from
	}: {
		asidePosition?: TwoColumnAsidePosition;
		stickyAside?: boolean;
		from?: TwoColumnFrom;
	} = $props();
</script>

<TwoColumnDetail {asidePosition} {stickyAside} {from} data-testid="detail">
	{#snippet aside()}
		<p>Πλευρική</p>
	{/snippet}
	<p>Κύρια</p>
</TwoColumnDetail>
