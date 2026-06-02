<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { HomeLandingMessageOptions } from '../types';

	let { messageOptions }: { messageOptions: HomeLandingMessageOptions } = $props();
</script>

<section class="border-b border-border bg-muted/35">
	<div class="mx-auto grid w-full max-w-7xl gap-4 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
		<div class="rounded-md border border-border bg-card p-5">
			<p class="text-2xl font-semibold">{m.stat_one_value({}, messageOptions)}</p>
			<p class="mt-1 text-sm text-muted-foreground">{m.stat_one_label({}, messageOptions)}</p>
		</div>
		<div class="rounded-md border border-border bg-card p-5">
			<p class="text-2xl font-semibold">{m.stat_two_value({}, messageOptions)}</p>
			<p class="mt-1 text-sm text-muted-foreground">{m.stat_two_label({}, messageOptions)}</p>
		</div>
		<div class="rounded-md border border-border bg-card p-5">
			<p class="text-2xl font-semibold">{m.stat_three_value({}, messageOptions)}</p>
			<p class="mt-1 text-sm text-muted-foreground">
				{m.stat_three_label({}, messageOptions)}
			</p>
		</div>
	</div>
</section>
