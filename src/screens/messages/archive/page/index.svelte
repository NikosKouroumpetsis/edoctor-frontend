<script lang="ts">
	import Inbox from '$modules/messages/ui/inbox';
	import { useMessagesArchiveScreen } from '../hooks';

	const screen = useMessagesArchiveScreen();
</script>

<!-- 🔴 U-84 Π1 (Airbnb's IMG_2611): «Προηγούμενες συνομιλίες», a page with ←, no capsule below 744. -->
<Inbox locale={screen.locale} links={screen.links} archive />
