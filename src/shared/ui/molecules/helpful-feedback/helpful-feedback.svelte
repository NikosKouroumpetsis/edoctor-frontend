<script lang="ts" module>
	/** `md` closing a text (the tile, 48), `sm` inside an open answer (the outlined circle, 40 in its 48). */
	export type HelpfulFeedbackSize = 'md' | 'sm';
	export type HelpfulFeedbackValue = 'up' | 'down';
	export type HelpfulFeedbackReason = { id: string; label: string };

	export type HelpfulFeedbackProps = {
		size?: HelpfulFeedbackSize;
		/** The reader's own answer, or none yet. */
		value: HelpfulFeedbackValue | null;
		/** The reason chosen after «down», or none. */
		reason?: string | null;
		/** The reasons offered after «down»: a closed list, never free text. Without them, only the thanks. */
		reasons?: readonly HelpfulFeedbackReason[];
		/** The words beside the thumbs before an answer. */
		question: string;
		/** The words after one. */
		thanks: string;
		/** What a screen reader hears when an answer is taken back. */
		undone: string;
		upLabel: string;
		downLabel: string;
		reasonsTitle?: string;
		/** A line under the thumbs when the answer did not go through. */
		failedMessage?: string | null;
		/** The press of a thumb: what it means (a second press takes it back) is the caller's. */
		onVote: (value: HelpfulFeedbackValue) => void;
		onReason?: (id: string) => void;
		class?: string;
		testId?: string;
	};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Chip } from '$shared/ui/primitives/chip';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		size = 'md',
		value,
		reason = null,
		reasons = [],
		question,
		thanks,
		undone,
		upLabel,
		downLabel,
		reasonsTitle,
		failedMessage,
		onVote,
		onReason,
		class: className,
		testId
	}: HelpfulFeedbackProps = $props();

	const questionId = useId(undefined, 'helpful-question');
	const reasonsId = useId(undefined, 'helpful-reasons');
	const answered = $derived(value !== null);
	const small = $derived(size === 'sm');
	const showsReasons = $derived(value === 'down' && reasons.length > 0);
	const glyphSize = $derived(small ? 'icon-md' : 'icon-lg');

	// The jump of the thumb pressed (CSS only, always seen, U-12): it plays on a press that chooses, not on a page that
	// opens with an answer already given.
	let popping = $state<HelpfulFeedbackValue | null>(null);
	let spoke = $state('');

	function press(pressed: HelpfulFeedbackValue) {
		popping = value === pressed ? null : pressed;
		spoke = value === pressed ? undone : thanks;
		onVote(pressed);
	}

	const live = $derived(failedMessage || spoke);

	const glyphLayer =
		'col-start-1 row-start-1 transition-[opacity,scale] duration-label ease-standard';
	const wordsLayer =
		'col-start-1 row-start-1 self-center transition-[opacity,translate] duration-label ease-standard';
</script>

{#snippet thumb(kind: HelpfulFeedbackValue, label: string)}
	{@const pressed = value === kind}
	{#snippet glyph()}
		<span
			data-slot="helpful-feedback-glyph"
			onanimationend={() => (popping = null)}
			class={cn(
				'grid place-items-center',
				popping === kind && (kind === 'up' ? 'animate-thumb-up-pop' : 'animate-thumb-down-pop')
			)}
		>
			<Ionicon
				name={kind === 'up' ? 'thumbs-up-outline' : 'thumbs-down-outline'}
				class={cn(glyphLayer, glyphSize, 'text-foreground', pressed && 'scale-120 opacity-0')}
			/>
			<Ionicon
				name={kind === 'up' ? 'thumbs-up' : 'thumbs-down'}
				class={cn(glyphLayer, glyphSize, 'text-foreground', !pressed && 'scale-60 opacity-0')}
			/>
		</span>
	{/snippet}
	{#if small}
		<IconButton
			appearance="outline"
			size="sm"
			{pressed}
			aria-label={label}
			data-testid={testId ? `${testId}-${kind}` : undefined}
			onclick={() => press(kind)}
			children={glyph}
		/>
	{:else}
		<IconButton
			appearance="tile"
			size="touch"
			{pressed}
			aria-label={label}
			data-testid={testId ? `${testId}-${kind}` : undefined}
			onclick={() => press(kind)}
			children={glyph}
		/>
	{/if}
{/snippet}

<!-- 🔴 U-78 (`23-helpful` Π2, Airbnb's): two thumbs, the words beside them on one line, the words changing in place once
     answered; after «down» the optional reasons open under them. No count of anyone's (U-78.1), no free text (U-65.6). -->
<div
	role="group"
	aria-labelledby={questionId}
	data-slot="helpful-feedback"
	data-size={size}
	data-state={value ?? 'none'}
	data-testid={testId}
	class={cn('min-w-0', className)}
>
	<div class={cn('flex flex-row items-center', small ? 'gap-2' : 'gap-4')}>
		<div class={cn('flex shrink-0 flex-row', small ? 'gap-0' : 'gap-touch-gap')}>
			{@render thumb('up', upLabel)}
			{@render thumb('down', downLabel)}
		</div>
		<p
			class={cn(
				'grid min-w-0',
				small ? 'text-body-sm text-muted-foreground' : 'text-body-lg text-foreground'
			)}
		>
			<span
				id={questionId}
				class={cn(wordsLayer, answered && '-translate-y-1.5 opacity-0')}
				aria-hidden={answered}
			>
				{question}
			</span>
			<span
				data-slot="helpful-feedback-thanks"
				class={cn(wordsLayer, !answered && 'translate-y-1.5 opacity-0')}
				aria-hidden={!answered}
			>
				{thanks}
			</span>
		</p>
	</div>

	{#if reasons.length > 0}
		<div
			data-slot="helpful-feedback-reasons"
			data-state={showsReasons ? 'open' : 'closed'}
			inert={!showsReasons}
			class="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-accordion ease-accordion data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0"
		>
			<div class="min-h-0 overflow-hidden">
				<p id={reasonsId} class={cn('text-body-sm text-muted-foreground', small ? 'pt-2' : 'pt-4')}>
					{reasonsTitle}
				</p>
				<div role="group" aria-labelledby={reasonsId} class="flex flex-row flex-wrap gap-x-2 pt-1">
					{#each reasons as entry (entry.id)}
						<Chip
							label={entry.label}
							variant="outline"
							size="md"
							selected={reason === entry.id}
							aria-pressed={reason === entry.id}
							textClass="font-normal text-body-sm"
							class="max-w-full"
							data-testid={testId ? `${testId}-reason-${entry.id}` : undefined}
							onclick={() => onReason?.(entry.id)}
						/>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if failedMessage}
		<p
			role="alert"
			data-slot="helpful-feedback-error"
			class="mt-2 flex flex-row items-center gap-1.5 text-label-lg font-normal text-danger-text"
		>
			<Ionicon name="alert-circle" class="icon-sm shrink-0" />
			<span>{failedMessage}</span>
		</p>
	{/if}
	<span class="sr-only" aria-live="polite">{live}</span>
</div>
