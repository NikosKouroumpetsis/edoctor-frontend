<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		title,
		titleId,
		value,
		dimmed = false,
		testId,
		action,
		children
	}: {
		title: string;
		/** The title's id, for the row's own link to say what it acts on. */
		titleId?: string;
		/** The line under the title. */
		value?: string;
		/** The password's row is open: this one fades and takes no press. */
		dimmed?: boolean;
		testId: string;
		/** The row's link on the right («Αποσύνδεση»); a row without one is words only. */
		action?: Snippet;
		/** What the row says under its line (a hint, a refusal). */
		children?: Snippet;
	} = $props();
</script>

<!-- A row of «Σύνδεση και ασφάλεια» that does not open in its place (record §5.4, `58-personal/pers.css` `.s-item`): the
     closed look of the shared `EditableRow` — its title 15 / 600 over one muted line 14, a link on the right in its 48
     box, a hairline under it. It fades while the password's row is open. Every word a text node. -->
<div
	data-testid={testId}
	data-dimmed={dimmed || undefined}
	class={cn(
		'border-b border-line py-5 transition-opacity duration-standard ease-standard',
		dimmed && 'pointer-events-none opacity-35'
	)}
>
	<div class="flex flex-row items-start justify-between gap-4">
		<div class="min-w-0">
			<h4 id={titleId} class="text-body-md font-semibold text-foreground">{title}</h4>
			{#if value}
				<p
					data-testid={`${testId}-value`}
					class="mt-0.5 text-body-sm wrap-anywhere text-muted-foreground"
				>
					{value}
				</p>
			{/if}
		</div>
		{@render action?.()}
	</div>
	{@render children?.()}
</div>
