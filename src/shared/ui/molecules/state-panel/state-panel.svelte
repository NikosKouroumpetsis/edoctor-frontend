<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type StatePanelProps = {
		/** The state's glyph in its 56 disc. */
		glyph: IoniconName;
		title: string;
		/** The heading's tag (the level is the page's). */
		titleAs?: 'h2' | 'h3' | 'p';
		description?: string;
		/** The one way on: a press (a retry) or a link (a cleared search), always with its words. */
		actionLabel?: string;
		actionHref?: string;
		onAction?: () => void;
		/** `status` (polite) for a list that came back empty or failed. */
		role?: 'status' | 'alert' | null;
		testId?: string;
		actionTestId?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';

	let {
		glyph,
		title,
		titleAs = 'h2',
		description,
		actionLabel,
		actionHref,
		onAction,
		role = 'status',
		testId,
		actionTestId,
		class: className
	}: StatePanelProps = $props();

	const hasAction = $derived(Boolean(actionLabel) && (Boolean(actionHref) || Boolean(onAction)));
</script>

<!-- 🔴 U-57.2 / U-60.1 (the prototypes 06 and 08, `.a-state`): a list's empty or failed state in its frame — the
     hairline border, corner 24, 48 / 24 inside; the glyph's 56 disc, the title (18/600), a muted line (14), an outline
     button (44, 14) with the retry or the way out. -->
<section
	data-slot="state-panel"
	data-testid={testId}
	role={role ?? undefined}
	class={cn(
		'flex w-full flex-col items-center rounded-xl border border-border/60 px-6 py-section-lg text-center',
		className
	)}
>
	<StateGlyph name={glyph} class="mb-3.5" />
	<svelte:element this={titleAs} class="text-title-sm text-foreground">{title}</svelte:element>
	{#if description}
		<p class="mt-1.5 max-w-narrow text-body-sm text-muted-foreground">{description}</p>
	{/if}
	{#if hasAction && actionLabel}
		<Button
			tone="outline"
			radius="full"
			label={actionLabel}
			href={actionHref}
			onclick={actionHref ? undefined : () => onAction?.()}
			textClass="text-body-sm"
			class="mt-4.5"
			data-testid={actionTestId}
		/>
	{/if}
</section>
