<script lang="ts">
	import { SearchPanel } from './index';

	let { open = $bindable(false), onClose = () => {} }: { open?: boolean; onClose?: () => void } =
		$props();
	let anchor = $state<HTMLElement | null>(null);
</script>

<div class="relative">
	<div bind:this={anchor} data-testid="anchor">
		<button type="button" class="min-h-touch min-w-touch" onclick={() => (open = true)}>Πού</button>
	</div>
	<SearchPanel bind:open title="Αναζήτηση" closeLabel="Κλείσιμο" {anchor} {onClose} testId="panel">
		<button type="button" class="min-h-touch min-w-touch">Αθήνα</button>
		<button type="button" class="min-h-touch min-w-touch">Πειραιάς</button>
		{#snippet footer()}
			<button type="button" class="min-h-touch min-w-touch">Αναζήτηση γιατρών</button>
		{/snippet}
	</SearchPanel>
</div>
<button type="button" class="min-h-touch min-w-touch">Έξω</button>
