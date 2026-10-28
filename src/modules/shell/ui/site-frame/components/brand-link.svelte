<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { FrameMessageOptions } from '../types';

	let { href, messageOptions }: { href: ResolvedPathname; messageOptions: FrameMessageOptions } =
		$props();
</script>

<!-- The eDoctor mark and name, the home link of the header; the name shows from a 360 header (`@narrow:`). -->
<a
	{href}
	class="flex min-h-touch min-w-touch shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<span
		class="grid size-brand-mark place-items-center rounded-md bg-primary text-body-sm font-semibold text-primary-foreground"
	>
		e+
	</span>
	<span class="hidden text-body-lg font-semibold @narrow:inline">
		{m.brand_name({}, messageOptions)}
	</span>
</a>
