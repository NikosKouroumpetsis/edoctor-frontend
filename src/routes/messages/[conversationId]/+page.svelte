<script lang="ts">
	import ConversationScreen from '$screens/messages/[conversationId]';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<ConversationScreen conversationId={data.conversationId} />
