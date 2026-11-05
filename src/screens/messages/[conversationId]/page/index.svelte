<script lang="ts">
	import Inbox from '$modules/messages/ui/inbox';
	import { useConversationScreen } from '../hooks';
	import type { ConversationScreenProps } from '../types';

	let { conversationId }: ConversationScreenProps = $props();

	const screen = useConversationScreen();
</script>

<!-- 🔴 U-84 Π2: a conversation: its own screen below 950, beside the list from it. -->
<Inbox locale={screen.locale} links={screen.links} {conversationId} />
