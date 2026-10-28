<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** The underlined link under the summary: its words and a press (the application's `onLink`) or a page. */
	type ReviewSummaryLink =
		| { linkLabel: string; onLink: () => void; linkHref?: undefined }
		| { linkLabel: string; linkHref: string; onLink?: undefined }
		| { linkLabel?: undefined; onLink?: undefined; linkHref?: undefined };

	export type ReviewSummaryProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
		ReviewSummaryLink & {
			/** Formatted by the caller («4,9», S-31.2). */
			score: string;
			title: string;
			/** «124 αξιολογήσεις», or a `description` (the caller's own line). */
			count?: string;
			description?: string;
			testId?: string;
			/** `<prefix>-count`, `<prefix>-description` (the application's test ids). */
			testIdPrefix?: string;
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { LaurelScore } from '$shared/ui/molecules/laurel-score';
	import { Text } from '$shared/ui/primitives/text';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		score,
		title,
		count,
		description,
		linkLabel,
		onLink,
		linkHref,
		testId,
		testIdPrefix,
		class: className,
		...restProps
	}: ReviewSummaryProps = $props();

	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
</script>

<!-- The application's summary (M-14), centred: the score between two filled laurels, the title, the caller's line
     and an underlined link. -->
<div
	data-slot="review-summary"
	data-testid={testId}
	class={cn('flex flex-col items-center gap-3', className)}
	{...restProps}
>
	<LaurelScore filled label={score} size="score" />
	<p class="text-heading-sm font-semibold text-foreground">{title}</p>
	{#if count}
		<Text variant="caption" data-testid={testIdOf('count')}>{count}</Text>
	{/if}
	{#if description}
		<Text variant="caption" class="text-center" data-testid={testIdOf('description')}
			>{description}</Text
		>
	{/if}
	{#if linkLabel !== undefined}
		<TextButton label={linkLabel} underline href={linkHref} onclick={onLink} />
	{/if}
</div>
