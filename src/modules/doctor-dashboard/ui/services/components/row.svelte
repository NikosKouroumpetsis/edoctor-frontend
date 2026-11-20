<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { doctorServiceArrowTarget } from '$modules/doctor-dashboard/lib/services';
	import type { DoctorServiceDrag } from '../hooks';
	import type { DoctorServiceRow } from '../types';

	let {
		row,
		index,
		count,
		href,
		hintId,
		drag,
		onMove
	}: {
		row: DoctorServiceRow;
		/** Its place in the order shown, from 0. */
		index: number;
		count: number;
		/** The service's own page, resolved in the page's language. */
		href: string;
		/** The id of the words that say how the order changes. */
		hintId: string;
		drag: DoctorServiceDrag;
		/** The service goes to another place (from 0): an arrow. */
		onMove: (index: number) => void;
	} = $props();

	const lifted = $derived(drag.lifted?.id === row.id ? drag.lifted : null);

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && drag.lifted) {
			drag.cancel();
			return;
		}
		const target = doctorServiceArrowTarget(event.key, index, count);
		if (target === null) return;
		event.preventDefault();
		onMove(target);
	}
</script>

<!-- 🔴 U-212.1 · D-W52-81 (`64-switch/sw.js` `usBody`, the photos' order of D-W52-39): one service of the doctor — its
     title over «30′ · 60 €», «›» at its end, a link to its own page (U-102). The row is the handle of the order: dragged
     with the pointer (a finger holds first), or moved a place with ↑ / ↓ while it has the focus. No colour under the
     pointer (U-100); every word a text node (U-65.6). -->
<li
	data-service-id={row.id}
	data-testid={`doctor-service-row-${index + 1}`}
	data-lifted={lifted ? '' : undefined}
	style:transform={lifted ? `translateY(${lifted.y}px)` : undefined}
	class={['relative border-b border-line last:border-b-0', lifted && 'z-10']}
>
	<!-- The service's page, already resolved in the page's language (a module knows no route). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		draggable="false"
		aria-describedby={hintId}
		data-slot="doctor-service-handle"
		data-testid={`doctor-service-${row.id}`}
		onpointerdown={(event) => drag.down(event, row.id)}
		onclick={(event) => drag.click(event)}
		{onkeydown}
		class={[
			'flex min-h-row-lg w-full cursor-grab flex-row items-center gap-4 rounded-sm bg-card py-3.5 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
			lifted && 'cursor-grabbing shadow-floating'
		]}
	>
		<span class="flex min-w-0 flex-1 flex-col gap-0.5">
			<span class="text-body-lg font-medium wrap-anywhere text-foreground">{row.title}</span>
			<span data-slot="doctor-service-line" class="text-body-sm text-muted-foreground"
				>{row.line}</span
			>
		</span>
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</li>
