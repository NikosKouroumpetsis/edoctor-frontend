<script lang="ts">
	import { getNotificationBadge } from '$shared/state/notification-badge';
	import { NotificationBell } from '$modules/notifications/ui/inbox';

	const badge = getNotificationBadge();
</script>

<!-- Tests only: what the frame and the «Προφίλ» read of the host — the count, «something is new», and the bell itself. -->
<output data-testid="badge">{badge.count}:{badge.hasNew}</output>
<NotificationBell locale="el" href="/notifications" />
