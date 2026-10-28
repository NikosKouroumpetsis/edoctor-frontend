<script lang="ts" module>
	import type { TextButtonTone } from '$shared/ui/primitives/text-button';

	export type InlineNoticeVariant = 'muted' | 'tint' | 'danger';
	/** `status` (polite) or `alert` (at once) for a notice that comes and goes; `null` for one that is always there. */
	export type InlineNoticeRole = 'status' | 'alert' | null;

	/** At most one way on, always with its words (the application shows it only with both). */
	export type InlineNoticeAction =
		| { actionLabel: string; onAction: () => void }
		| { actionLabel?: undefined; onAction?: undefined };

	// Each look's box, alone and with its action below the message (study D7, M-27).
	const boxClasses: Record<InlineNoticeVariant, { alone: string; withAction: string }> = {
		danger: { alone: 'gap-1.5 px-1', withAction: 'gap-1.5 px-1' },
		muted: {
			alone: 'rounded-md bg-muted px-3 py-3',
			withAction: 'gap-2 rounded-md bg-muted px-3 py-3'
		},
		tint: {
			alone: 'rounded-md bg-foreground/6 px-3 py-2.5',
			withAction: 'gap-2 rounded-md bg-foreground/6 px-3 py-2.5'
		}
	};

	const messageClasses: Record<InlineNoticeVariant, string> = {
		danger: 'text-label-md text-danger-text',
		muted: 'text-label-md text-muted-foreground',
		tint: 'text-label-lg text-foreground'
	};

	// The action is the kit's text button: its label semibold in the look's colour, underlined but in `danger`.
	const actionLooks: Record<
		InlineNoticeVariant,
		{ tone: TextButtonTone; underline: boolean; textClass: string }
	> = {
		danger: { tone: 'danger', underline: false, textClass: 'text-label-md' },
		muted: { tone: 'foreground', underline: true, textClass: 'text-label-md' },
		tint: { tone: 'foreground', underline: true, textClass: 'text-label-lg' }
	};

	// What each look says to a screen reader when the caller names nothing: an empty or failed list politely, a
	// refusal at once, a note that is part of the section not at all.
	const defaultRoles: Record<InlineNoticeVariant, InlineNoticeRole> = {
		danger: 'alert',
		muted: 'status',
		tint: null
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		message,
		variant = 'muted',
		actionLabel,
		onAction,
		role,
		testId,
		actionTestId
	}: InlineNoticeAction & {
		message: string;
		variant?: InlineNoticeVariant;
		/** The live role; by default the look's (`muted` status, `danger` alert, `tint` none). */
		role?: InlineNoticeRole;
		testId?: string;
		actionTestId?: string;
	} = $props();

	const hasAction = $derived(Boolean(actionLabel) && typeof onAction === 'function');
	const box = $derived(boxClasses[variant]);
	const action = $derived(actionLooks[variant]);
	const liveRole = $derived(role === undefined ? defaultRoles[variant] : role);
</script>

<!-- The application's inline notice: a short sentence in a list or a section, with at most one way on below it, a
     48 target sized to its words. -->
<div
	data-slot="inline-notice"
	data-variant={variant}
	data-testid={testId}
	role={liveRole ?? undefined}
	class={cn('flex flex-col', hasAction ? box.withAction : box.alone)}
>
	<p class={messageClasses[variant]}>{message}</p>
	{#if hasAction && actionLabel}
		<TextButton
			label={actionLabel}
			tone={action.tone}
			underline={action.underline}
			textClass={action.textClass}
			class="self-start"
			data-testid={actionTestId}
			onclick={() => onAction?.()}
		/>
	{/if}
</div>
