<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	export type BannerTone = 'info' | 'success' | 'warning' | 'danger';
	/** The status tones that may opt into their solid fill (`info` keeps its tint). */
	export type BannerSolidTone = Exclude<BannerTone, 'info'>;

	/** A dismissable banner names its «×» with the caller's words; one without `onDismiss` has none. */
	export type BannerDismiss =
		| { dismissLabel?: undefined; onDismiss?: undefined }
		| { dismissLabel: string; onDismiss: () => void };

	/** At most one way on, a link, always with its words (the notice of a text page, U-59.2). */
	export type BannerAction =
		| { actionLabel: string; actionHref: string }
		| { actionLabel?: undefined; actionHref?: undefined };

	export type BannerProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> &
		BannerDismiss &
		BannerAction & {
			title: string;
			description?: string;
			tone?: BannerTone;
			/** The success / warning / danger fill instead of the soft tint (off by default, S-34.1). */
			solid?: boolean;
			/**
			 * One sentence (U-62.1, the text pages' notice): the title runs into the description on the same line, the
			 * title bold in the tone's colour, the rest in the text's (15).
			 */
			inline?: boolean;
		};

	const toneContainerClasses: Record<BannerTone, string> = {
		info: 'border-primary/20 bg-primary/10',
		success: 'border-success/20 bg-success/10',
		warning: 'border-warning/20 bg-warning/10',
		danger: 'border-danger/20 bg-danger/10'
	};

	const toneTitleClasses: Record<BannerTone, string> = {
		info: 'text-primary-text',
		success: 'text-success-text',
		warning: 'text-foreground',
		danger: 'text-danger-text'
	};

	const toneIconClasses: Record<BannerTone, string> = {
		info: 'text-primary-text',
		success: 'text-success-text',
		warning: 'text-warning-icon',
		danger: 'text-danger-text'
	};

	// Opt-in solid status tones: danger / success fill in their text colour, the label at least 4.5:1 (S-34.1).
	const solidContainerClasses: Record<BannerSolidTone, string> = {
		success: 'border-success-text bg-success-text',
		warning: 'border-warning bg-warning',
		danger: 'border-danger-text bg-danger-text'
	};

	// On a solid fill the title, the line and both glyphs wear the fill's own foreground.
	const solidForegroundClasses: Record<BannerSolidTone, string> = {
		success: 'text-success-foreground',
		warning: 'text-warning-foreground',
		danger: 'text-danger-foreground'
	};

	const toneIcons: Record<BannerTone, IoniconName> = {
		info: 'information-circle',
		success: 'checkmark-circle',
		warning: 'warning',
		danger: 'alert-circle'
	};

	const isSolidTone = (tone: BannerTone): tone is BannerSolidTone => tone !== 'info';

	// The live role each tone takes when the caller names none (R1 MINOR-1): only a danger interrupts (`alert`), the
	// others are read politely (`status`). The application's `accessibilityRole="alert"` announces nothing.
	const defaultRoles: Record<BannerTone, 'alert' | 'status'> = {
		danger: 'alert',
		warning: 'status',
		info: 'status',
		success: 'status'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		title,
		description,
		tone = 'info',
		solid = false,
		inline = false,
		actionLabel,
		actionHref,
		dismissLabel,
		onDismiss,
		class: className,
		...restProps
	}: BannerProps = $props();

	// Narrowed to a status tone only when the fill is asked for; `info` and the tint keep their own look.
	const solidTone = $derived(solid && isSolidTone(tone) ? tone : null);
	const containerClass = $derived(
		solidTone ? solidContainerClasses[solidTone] : toneContainerClasses[tone]
	);
	const titleClass = $derived(
		solidTone ? solidForegroundClasses[solidTone] : toneTitleClasses[tone]
	);
	const descriptionClass = $derived(
		solidTone ? solidForegroundClasses[solidTone] : 'text-foreground/80'
	);
	const iconClass = $derived(solidTone ? solidForegroundClasses[solidTone] : toneIconClasses[tone]);
	const dismissClass = $derived(
		solidTone ? solidForegroundClasses[solidTone] : 'text-muted-foreground'
	);
</script>

<!-- The application's status banner: its tone's glyph, a semibold title over an optional line, and an optional «×»
     in the 48 box. Its tone's live role; the caller's `role` wins (`alert` when it is urgent, `null` for none). -->
<div
	role={defaultRoles[tone]}
	data-slot="banner"
	data-tone={tone}
	data-solid={solidTone ? 'true' : undefined}
	class={cn(
		'flex w-full flex-row items-start gap-3 rounded-md border p-4',
		containerClass,
		className
	)}
	{...restProps}
>
	<Ionicon name={toneIcons[tone]} class={cn('icon-md', iconClass)} />

	<div class="flex min-w-0 flex-1 flex-col gap-1">
		{#if inline}
			<p class="text-body-md text-foreground">
				<strong class={cn('font-semibold', titleClass)}>{title}</strong
				>{#if description}{` ${description}`}{/if}
			</p>
		{:else}
			<p class={cn('text-body-md font-semibold', titleClass)}>{title}</p>
			{#if description}
				<p class={cn('text-body-sm', descriptionClass)}>{description}</p>
			{/if}
		{/if}
		{#if actionLabel && actionHref}
			<a
				href={actionHref}
				data-slot="banner-action"
				class={cn(
					'inline-flex min-h-touch min-w-touch items-center self-start rounded-sm text-body-md font-semibold underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2',
					titleClass
				)}>{actionLabel}</a
			>
		{/if}
	</div>

	{#if onDismiss}
		<button
			type="button"
			data-slot="banner-dismiss"
			aria-label={dismissLabel}
			class="inline-flex size-touch shrink-0 items-center justify-center rounded-full transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-foreground/5"
			onclick={() => onDismiss?.()}
		>
			<Ionicon name="close" class={cn('icon-md', dismissClass)} />
		</button>
	{/if}
</div>
