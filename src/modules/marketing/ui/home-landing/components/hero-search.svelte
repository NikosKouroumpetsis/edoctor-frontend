<script lang="ts">
	import SearchIcon from '~icons/lucide/search';
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import { Input } from '$shared/ui/primitives/input';
	import type { HomeLandingMessageOptions, LocalizedHref } from '../types';

	let {
		messageOptions,
		localizedHref
	}: {
		messageOptions: HomeLandingMessageOptions;
		localizedHref: LocalizedHref;
	} = $props();
</script>

<form
	id="search"
	action={localizedHref('/doctors')}
	class="mt-8 grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
>
	<label class="grid gap-1.5">
		<span class="text-xs font-medium text-muted-foreground">
			{m.search_specialty_label({}, messageOptions)}
		</span>
		<Input
			name="specialty"
			placeholder={m.search_specialty_placeholder({}, messageOptions)}
			class="h-11 bg-background"
			autocomplete="off"
		/>
	</label>

	<label class="grid gap-1.5">
		<span class="text-xs font-medium text-muted-foreground">
			{m.search_area_label({}, messageOptions)}
		</span>
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
