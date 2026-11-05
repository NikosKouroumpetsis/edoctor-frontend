<script lang="ts">
	import { getInboxBadge } from '$shared/state/inbox-badge';
	import { getInboxMemory } from '$modules/messages/ui/inbox-memory';

	const badge = getInboxBadge();
	const memory = getInboxMemory();
</script>

<output data-testid="badge">{badge.count}:{badge.label}</output>
<output data-testid="inbox-filter">{memory.filter}</output>
<button
	type="button"
	class="min-h-touch min-w-touch"
	data-testid="choose-chip"
	onclick={() => (memory.filter = 'patients')}>chip</button
>
