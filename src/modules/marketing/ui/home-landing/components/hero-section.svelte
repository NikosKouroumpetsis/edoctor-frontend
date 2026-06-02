<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { HomeLandingMessageOptions, LocalizedHref } from '../types';
	import CareFlowPanel from './care-flow-panel.svelte';
	import HeroSearch from './hero-search.svelte';
	import TrustStrip from './trust-strip.svelte';

	let {
		messageOptions,
		localizedHref
	}: {
		messageOptions: HomeLandingMessageOptions;
		localizedHref: LocalizedHref;
	} = $props();
</script>

<section class="border-b border-border bg-background">
	<div
		class="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8"
	>
		<div class="max-w-3xl">
			<p class="text-sm font-semibold text-primary">{m.hero_kicker({}, messageOptions)}</p>
			<h1
				class="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl"
			>
				{m.hero_title({}, messageOptions)}
			</h1>
			<p class="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
				{m.hero_body({}, messageOptions)}
			</p>

			<HeroSearch {messageOptions} {localizedHref} />
			<TrustStrip {messageOptions} />
		</div>

		<CareFlowPanel {messageOptions} {localizedHref} />
	</div>
</section>
