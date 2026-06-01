<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CalendarCheckIcon from '~icons/lucide/calendar-check';
	import HeartPulseIcon from '~icons/lucide/heart-pulse';
	import MapPinIcon from '~icons/lucide/map-pin';
	import SearchIcon from '~icons/lucide/search';
	import ShieldCheckIcon from '~icons/lucide/shield-check';
	import VideoIcon from '~icons/lucide/video';
	import { Button } from '$shared/ui/primitives/button';
	import { Input } from '$shared/ui/primitives/input';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
</script>

<svelte:head>
	<title>{m.home_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.home_meta_description({}, messageOptions)} />
</svelte:head>

<main>
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

				<form
					id="search"
					action={localizedHref('/doctors')}
					class="mt-8 grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
				>
					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-muted-foreground"
							>{m.search_specialty_label({}, messageOptions)}</span
						>
						<Input
							name="specialty"
							placeholder={m.search_specialty_placeholder({}, messageOptions)}
							class="h-11 bg-background"
							autocomplete="off"
						/>
					</label>

					<label class="grid gap-1.5">
						<span class="text-xs font-medium text-muted-foreground"
							>{m.search_area_label({}, messageOptions)}</span
						>
						<Input
							name="area"
							placeholder={m.search_area_placeholder({}, messageOptions)}
							class="h-11 bg-background"
							autocomplete="address-level2"
						/>
					</label>

					<Button type="submit" size="lg" class="h-11 self-end px-4">
						<SearchIcon class="size-4" />
						{m.search_button({}, messageOptions)}
					</Button>
				</form>

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
			</div>

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
		</div>
	</section>

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
</main>
