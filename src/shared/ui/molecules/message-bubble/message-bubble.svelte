<script lang="ts" module>
	/** `pending` on its way, `failed` it did not leave (the words stay, to send again). */
	export type MessageBubbleStatus = 'sent' | 'pending' | 'failed';

	/** How long a finger rests on a message before its action opens (the application's long press). */
	const LONG_PRESS_MS = 500;
	const MOVE_TOLERANCE = 8;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$shared/lib/utils';

	let {
		text,
		mine = false,
		status = 'sent',
		joinsPrevious = false,
		joinsNext = false,
		fresh = false,
		more,
		onLongPress,
		class: className,
		testId
	}: {
		/** 🔴 What a person wrote: a text node and nothing else, whatever it holds (U-65.6, U-84.2). */
		text: string;
		mine?: boolean;
		status?: MessageBubbleStatus;
		/** The same side, close in time: the corner it shares with the one above is the small one. */
		joinsPrevious?: boolean;
		/** …and with the one below. */
		joinsNext?: boolean;
		/** It has just arrived: it rises into place. */
		fresh?: boolean;
		/** Its one action, shown with a pointer on it or with the focus, beside the message and taking no room from it. */
		more?: Snippet;
		/** With a finger, where there is no pointer to show `more`. */
		onLongPress?: () => void;
		class?: string;
		testId?: string;
	} = $props();

	// No target of its own: the same action has its keyboard way, `more` with a pointer and the menu of the conversation.
	let timer: ReturnType<typeof setTimeout> | undefined;
	let restedAt = { x: 0, y: 0 };
	const onpointerdown = (event: PointerEvent) => {
		if (!onLongPress || event.pointerType !== 'touch') return;
		restedAt = { x: event.clientX, y: event.clientY };
		timer = setTimeout(() => onLongPress?.(), LONG_PRESS_MS);
	};
	const onpointerup = () => clearTimeout(timer);
	const onpointercancel = onpointerup;
	// A finger never rests perfectly still: only a real move (a scroll) takes the press back.
	const onpointermove = (event: PointerEvent) => {
		if (Math.hypot(event.clientX - restedAt.x, event.clientY - restedAt.y) > MOVE_TOLERANCE) {
			clearTimeout(timer);
		}
	};
</script>

<!-- U-84 Π2: the 20 corner (6 where it joins the next of its group). Mine on the primary, the other's on the 6 % ink; what
     did not leave on the danger's tint. Never a link and never markup: the words are the text node of one `<p>`, so
     `<script>` or an address show as they were written. 🔴 U-81.2: below 744 the application's `MessageBubble`: at least
     48 × 48, 16 at 1.5, 12 · 14 inside, and one on its way as it is; from 744 the prototype: 16 at 1.4, 10 · 14, at 70 %. -->
<div
	data-slot="message-bubble-row"
	class={cn('group relative flex max-w-full', mine && 'justify-end', className)}
>
	<p
		data-slot="message-bubble"
		data-mine={mine || undefined}
		data-status={status}
		data-testid={testId}
		{onpointerdown}
		{onpointerup}
		{onpointercancel}
		{onpointermove}
		class={cn(
			'min-h-touch max-w-full min-w-touch rounded-bubble px-3.5 py-3 text-body-lg wrap-anywhere whitespace-pre-wrap tablet:min-h-0 tablet:min-w-0 tablet:py-2.5 tablet:text-bubble',
			mine ? 'bg-primary text-primary-foreground' : 'bg-foreground/6 text-foreground',
			status === 'pending' && 'tablet:opacity-70',
			status === 'failed' && 'bg-danger/15 text-foreground tablet:bg-danger/16',
			joinsPrevious && (mine ? 'rounded-tr-bubble-tail' : 'rounded-tl-bubble-tail'),
			joinsNext && (mine ? 'rounded-br-bubble-tail' : 'rounded-bl-bubble-tail'),
			fresh && 'animate-bubble-in'
		)}
	>
		{text}
	</p>
	{#if more}
		<span
			data-slot="message-bubble-more"
			class="absolute top-1/2 left-full hidden -translate-y-1/2 opacity-0 transition-opacity duration-standard ease-standard group-hover:opacity-100 focus-within:opacity-100 can-hover:block"
		>
			{@render more()}
		</span>
	{/if}
</div>
