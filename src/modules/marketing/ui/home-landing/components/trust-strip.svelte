<script lang="ts">
	import CalendarCheckIcon from '~icons/lucide/calendar-check';
	import ShieldCheckIcon from '~icons/lucide/shield-check';
	import VideoIcon from '~icons/lucide/video';
	import { m } from '$paraglide/messages.js';
	import type { HomeLandingMessageOptions } from '../types';

	let { messageOptions }: { messageOptions: HomeLandingMessageOptions } = $props();
</script>

<div class="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
	<div class="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
		<ShieldCheckIcon class="size-4 text-primary" />
		<span>{m.trust_item_one({}, messageOptions)}</span>
	</div>
	<div class="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
		<CalendarCheckIcon class="size-4 text-primary" />
		<span>{m.trust_item_two({}, messageOptions)}</span>
	</div>
	<div class="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
		<VideoIcon class="size-4 text-primary" />
		<span>{m.trust_item_three({}, messageOptions)}</span>
	</div>
</div>
