<script lang="ts">
	import { getDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';

	let { onRead }: { onRead: (standing: DoctorStanding) => void } = $props();

	const standing = getDoctorStanding();
	// svelte-ignore state_referenced_locally
	onRead(standing);
</script>

<!-- Tests only: what a page reads of the standing. -->
<p data-testid="standing-kind">{standing.kind}</p>
<p data-testid="standing-mode">{standing.lastMode}</p>
<p data-testid="standing-known">{standing.known ? 'known' : 'waiting'}</p>
