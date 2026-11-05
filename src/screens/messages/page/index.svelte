<script lang="ts">
	import Inbox from '$modules/messages/ui/inbox';
	import { useMessagesScreen } from '../hooks';

	const screen = useMessagesScreen();
</script>

<!-- 🔴 U-84 (wave 2, screen 21): the messages module's page; the browser fills it in (U-80.1 Ε6). -->
<Inbox locale={screen.locale} links={screen.links} />
