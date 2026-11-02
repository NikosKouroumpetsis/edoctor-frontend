<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { FrameMessageOptions } from '../types';

	let { href, messageOptions }: { href: ResolvedPathname; messageOptions: FrameMessageOptions } =
		$props();
</script>

<!-- The eDoctor mark, the home link of the top bar: the «e+» square (primary, the 8 corner) alone at 744, with the
     word from 1128 (Airbnb's, U-16.8). -->
<a
	{href}
	aria-label={m.brand_name({}, messageOptions)}
	data-slot="brand-link"
	class="flex min-h-touch min-w-touch shrink-0 flex-row items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<span
		aria-hidden="true"
		class="grid size-brand-mark place-items-center rounded-sm bg-primary text-label-md font-bold text-primary-foreground"
	>
		e+
	</span>
	<span aria-hidden="true" class="hidden text-title-xs font-semibold text-foreground laptop:inline">
		{m.brand_name({}, messageOptions)}
	</span>
</a>
