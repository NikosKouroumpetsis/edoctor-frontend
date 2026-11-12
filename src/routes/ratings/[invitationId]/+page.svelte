<script lang="ts">
	import RatingInvitationScreen from '$screens/ratings/[invitationId]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<RatingInvitationScreen invitationId={data.invitationId} />
