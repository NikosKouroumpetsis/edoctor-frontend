<script lang="ts">
	import HeartPulseIcon from '~icons/lucide/heart-pulse';
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import type { HomeLandingMessageOptions, LocalizedHref } from '../types';

	let {
		messageOptions,
		localizedHref
	}: {
		messageOptions: HomeLandingMessageOptions;
		localizedHref: LocalizedHref;
	} = $props();
</script>

<aside class="rounded-md border border-border bg-card p-5 shadow-sm">
	<div class="flex items-start justify-between gap-4 border-b border-border pb-5">
		<div>
			<p class="text-sm font-medium text-muted-foreground">
				{m.panel_label({}, messageOptions)}
			</p>
			<h2 class="mt-1 text-2xl font-semibold tracking-normal">
				{m.panel_title({}, messageOptions)}
			</h2>
		</div>
		<div class="grid size-11 place-items-center rounded-md bg-accent text-accent-foreground">
			<HeartPulseIcon class="size-5" />
		</div>
	</div>

	<div class="grid gap-4 py-5">
		<div class="flex gap-3">
			<div class="mt-1 size-2 rounded-full bg-primary"></div>
			<div>
				<p class="font-medium">{m.flow_step_one_title({}, messageOptions)}</p>
				<p class="text-sm leading-6 text-muted-foreground">
					{m.flow_step_one_body({}, messageOptions)}
				</p>
			</div>
		</div>
		<div class="flex gap-3">
			<div class="mt-1 size-2 rounded-full bg-chart-2"></div>
			<div>
				<p class="font-medium">{m.flow_step_two_title({}, messageOptions)}</p>
				<p class="text-sm leading-6 text-muted-foreground">
					{m.flow_step_two_body({}, messageOptions)}
				</p>
			</div>
		</div>
		<div class="flex gap-3">
			<div class="mt-1 size-2 rounded-full bg-chart-3"></div>
			<div>
				<p class="font-medium">{m.flow_step_three_title({}, messageOptions)}</p>
				<p class="text-sm leading-6 text-muted-foreground">
					{m.flow_step_three_body({}, messageOptions)}
				</p>
			</div>
		</div>
	</div>

	<Button href={localizedHref('/doctors')} variant="secondary" class="w-full">
		{m.panel_cta({}, messageOptions)}
	</Button>
</aside>
