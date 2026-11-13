<script lang="ts">
	import NotificationsScreen from '$screens/notifications';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<NotificationsScreen {data} />
