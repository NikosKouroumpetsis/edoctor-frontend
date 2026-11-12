<script lang="ts">
	import { Button } from '$shared/ui/primitives/button';

	let {
		title,
		body,
		cta,
		href,
		onOpen
	}: {
		title: string;
		body: string;
		/** «Αξιολογήστε την επίσκεψη» (U-138.6: the act). */
		cta: string;
		href: string;
		onOpen: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- U-135.5 (record §7.2): after the visit, while an invitation is open (P-B4 §13.3.4), «Πώς ήταν η επίσκεψη;» and the way
     to the form (screen 54, a page of its own, U-102). The band of `appt.css:140-143`. U-154: under 744 the button takes
     the band's whole width (the column stretches it, its label centred), as the prototype's. U-156: one row only when the
     screen is from 744 AND the band itself is as wide as `row-wide` (520, read from the box around it): in the narrow
     right column from 950 it stays the phone's column, so its words are never squeezed beside the button. -->
<div class="@container mb-4">
	<div
		data-testid="appointment-ask"
		class="flex flex-col gap-3.5 rounded-md border border-line bg-background p-4 tablet:row-wide:flex-row tablet:row-wide:items-center tablet:row-wide:justify-between"
	>
		<div class="min-w-0">
			<h3 class="text-body-lg font-semibold text-foreground">{title}</h3>
			<p class="mt-0.5 text-body-sm text-muted-foreground">{body}</p>
		</div>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			{href}
			label={cta}
			textClass="text-body-sm"
			onclick={onOpen}
			data-testid="appointment-rate"
			class="self-stretch tablet:row-wide:shrink-0 tablet:row-wide:self-center"
		/>
	</div>
</div>
