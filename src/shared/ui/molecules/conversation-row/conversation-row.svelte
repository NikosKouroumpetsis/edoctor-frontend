<script lang="ts" module>
	/** The initial's circle when there is no photo: `primary` a person the page sells, `neutral` anybody else. */
	export type ConversationRowAvatarTone = 'primary' | 'neutral';

	const initialTones: Record<ConversationRowAvatarTone, string> = {
		primary: 'bg-primary/12 text-primary-text',
		neutral: 'bg-foreground/8 text-foreground/80'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Avatar, AvatarFallback, AvatarImage } from '$shared/ui/primitives/avatar';

	let {
		href,
		title,
		subtitle,
		preview,
		previewPrefix,
		time,
		accessibleLabel,
		unread = false,
		selected = false,
		imageUrl,
		initial,
		avatarTone = 'primary',
		onclick,
		class: className,
		testId
	}: {
		href: string;
		/** The other person. */
		title: string;
		/** Who they are (a specialty, a role). */
		subtitle?: string;
		/** The last message, one line, as text: nothing in it opens or presses. */
		preview?: string;
		/** Before a message of the reader's own («Εσείς: »). */
		previewPrefix?: string;
		/** When, already told («14:32», «Χθες»). */
		time?: string;
		/** What the row is for a screen reader (the time and the message stay out of its name). */
		accessibleLabel?: string;
		unread?: boolean;
		/** The conversation open beside the list. */
		selected?: boolean;
		imageUrl?: string | null;
		initial: string;
		avatarTone?: ConversationRowAvatarTone;
		onclick?: (event: MouseEvent) => void;
		class?: string;
		testId?: string;
	} = $props();
</script>

<!-- U-84 Π1 (Airbnb's inbox): the 56 picture, the name 16/600 with the time 13 beside it, the last message 15 on one line,
     who they are 13. Unread: the message bold, the time in the primary, the 10 dot. Every word is a text node, so what a
     person wrote can be neither markup nor a link (U-65.6, U-84.2). 🔴 U-81.2: below 744 the application's `ConversationRow`:
     all in the middle, 12 above and below, no sides of its own, the name and the message at 1.5, the dot on the message's
     line; from 744 the prototype: from the top, 14, 8 at the sides, both at 1.4, the dot at the row's end. -->
<a
	{href}
	{onclick}
	aria-label={accessibleLabel}
	aria-current={selected ? 'page' : undefined}
	data-slot="conversation-row"
	data-unread={unread || undefined}
	data-testid={testId}
	class={cn(
		'relative flex min-h-touch w-full flex-row items-center gap-4 rounded-lg py-3 text-left transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:bg-foreground/6 tablet:items-start tablet:px-2 tablet:py-3.5 can-hover:hover:bg-foreground/4',
		selected && 'bg-foreground/6 can-hover:hover:bg-foreground/6',
		className
	)}
>
	<Avatar class="size-tile" aria-hidden="true">
		{#if imageUrl}
			<AvatarImage src={imageUrl} alt="" />
		{/if}
		<AvatarFallback class={cn('text-title-lg', initialTones[avatarTone])}>{initial}</AvatarFallback>
	</Avatar>
	<span class={cn('grid min-w-0 flex-1 grid-cols-1 gap-0.5', unread && 'tablet:pr-4.5')}>
		<span class="flex flex-row items-baseline gap-2">
			<span
				class="min-w-0 flex-1 truncate text-body-lg font-semibold text-foreground tablet:text-bubble"
				>{title}</span
			>
			{#if time}
				<span
					data-slot="conversation-row-time"
					class={cn(
						'shrink-0 text-label-lg font-normal text-muted-foreground',
						unread && 'font-semibold text-primary-text'
					)}>{time}</span
				>
			{/if}
		</span>
		{#if preview || unread}
			<span class="flex flex-row items-center gap-2">
				{#if preview}
					<span
						data-slot="conversation-row-preview"
						class={cn(
							'min-w-0 flex-1 truncate text-body-md text-muted-foreground tablet:text-row-line',
							unread && 'font-semibold text-foreground'
						)}
						>{#if previewPrefix}<span class="font-normal text-muted-foreground"
								>{previewPrefix}</span
							>{/if}{preview}</span
					>
				{/if}
				{#if unread}
					<span
						aria-hidden="true"
						data-slot="conversation-row-dot"
						class="ml-auto size-2.5 shrink-0 rounded-full bg-primary tablet:absolute tablet:top-1/2 tablet:right-2 tablet:mt-1.5 tablet:ml-0"
					></span>
				{/if}
			</span>
		{/if}
		{#if subtitle}
			<span class="truncate text-label-lg font-normal text-muted-foreground">{subtitle}</span>
		{/if}
	</span>
</a>
