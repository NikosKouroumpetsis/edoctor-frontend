<script lang="ts">
	import CalendarCheckIcon from '~icons/lucide/calendar-check';
	import MapPinIcon from '~icons/lucide/map-pin';
	import VideoIcon from '~icons/lucide/video';
	import { m } from '$paraglide/messages.js';
	import type { HomeLandingMessageOptions } from '../types';

	let { messageOptions }: { messageOptions: HomeLandingMessageOptions } = $props();
</script>

<section class="bg-background">
	<div
		class="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8"
	>
		<div>
			<p class="text-sm font-semibold text-primary">{m.care_modes_kicker({}, messageOptions)}</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-normal">
				{m.care_modes_title({}, messageOptions)}
			</h2>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<div class="rounded-md border border-border bg-card p-5">
				<CalendarCheckIcon class="size-5 text-primary" />
				<h3 class="mt-4 font-semibold">{m.mode_one_title({}, messageOptions)}</h3>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					{m.mode_one_body({}, messageOptions)}
				</p>
			</div>
			<div class="rounded-md border border-border bg-card p-5">
				<VideoIcon class="size-5 text-primary" />
				<h3 class="mt-4 font-semibold">{m.mode_two_title({}, messageOptions)}</h3>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					{m.mode_two_body({}, messageOptions)}
				</p>
			</div>
			<div class="rounded-md border border-border bg-card p-5">
				<MapPinIcon class="size-5 text-primary" />
				<h3 class="mt-4 font-semibold">{m.mode_three_title({}, messageOptions)}</h3>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">
					{m.mode_three_body({}, messageOptions)}
				</p>
			</div>
		</div>
	</div>
</section>
