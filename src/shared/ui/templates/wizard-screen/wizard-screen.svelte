<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * A pill on the top bar (Airbnb's host flow: «Χρειάζεστε βοήθεια;», «Αποθήκευση και έξοδος»): a link or a button.
	 * `label` is its name everywhere and its words from 744; `shortLabel`, when given, its words below 744; `disabled`
	 * locks a button's while its caller is busy (a link has no such state).
	 */
	export type WizardScreenPill = {
		key: string;
		label: string;
		shortLabel?: string;
		icon?: IoniconName;
		href?: string;
		onClick?: () => void;
		disabled?: boolean;
		testId?: string;
	};

	/** The bar's segmented progress: one segment per stage, the current one filled by `fill` (0..1), its spoken name. */
	export type WizardScreenProgress = {
		steps: number;
		currentStep: number;
		fill: number;
		label: string;
	};

	/** One action of the bar: its words, what it does, and whether it is locked (busy, or the step is not complete). */
	export type WizardScreenAction = {
		label: string;
		onClick: () => void;
		disabled?: boolean;
		loading?: boolean;
		testId?: string;
	};

	export type WizardScreenProps = {
		/** The page's heading (`h1`): 28/600, 30 from 744. */
		title?: string;
		/** The muted line under it: 16, 17 from 744. */
		subtitle?: string;
		/** The mark at the top bar's start, from 744 (the caller's home link). */
		brand?: Snippet;
		/** The pills at the top bar's end, in reading order. */
		pills?: WizardScreenPill[];
		/** The segmented progress over the bar; none without it (an overview, the last page). */
		progress?: WizardScreenProgress;
		/** «Πίσω» (underlined, at the start) and «Επόμενο» (the full round accent, at the end). */
		back?: WizardScreenAction;
		next?: WizardScreenAction;
		/** What the bar holds instead of «Πίσω / Επόμενο» (one button of the whole width, an overview's). */
		footer?: Snippet;
		/** From 744 the content stands in the middle of the screen's height (the steps); `false` keeps it at the top. */
		centered?: boolean;
		testId?: string;
		class?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { StepProgress } from '$shared/ui/primitives/step-progress';

	let {
		title,
		subtitle,
		brand,
		pills = [],
		progress,
		back,
		next,
		footer,
		centered = true,
		testId,
		class: className,
		children
	}: WizardScreenProps = $props();

	const pillClass =
		'group inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-full outline-none disabled:opacity-50';
</script>

<!-- The steps' frame (record §6.3, Airbnb's host flow; below 744 the application's, U-81.2): a top bar of its own (64,
     80 from 744) with the mark from 744 and the pills at its end; the content in a column of at most 630, from 744 in
     the middle of the screen's height; a bar pinned to the bottom with the progress in segments over «Πίσω» (underlined)
     and «Επόμενο» (the full round accent, locked until the step is complete). No hover colour anywhere, the bar's two
     actions included (U-100, D-W3-27), no modal (U-102). The page and its bar on the card's surface, as the prototype's
     `--page` (W8-Δ3: white, the dark theme's own). -->
<div
	data-slot="wizard-screen"
	data-testid={testId}
	class={cn('flex min-h-dvh flex-col bg-card text-foreground', className)}
>
	<header
		data-slot="wizard-screen-header"
		class="flex h-bar-top shrink-0 flex-row items-center justify-end gap-2 px-gutter-sm tablet:h-wizard-top tablet:gap-3 tablet:px-gutter-lg"
	>
		{#if brand}
			<div data-slot="wizard-screen-brand" class="mr-auto hidden items-center tablet:flex">
				{@render brand()}
			</div>
		{/if}
		{#each pills as pill (pill.key)}
			{@render pillOf(pill)}
		{/each}
	</header>

	<main
		data-slot="wizard-screen-main"
		class={cn(
			'flex flex-1 flex-col px-gutter-sm pt-2 pb-page-bar tablet:px-gutter-lg tablet:pt-4',
			centered && 'tablet:justify-center'
		)}
	>
		<div data-slot="wizard-screen-column" class="mx-auto flex w-full max-w-wizard-column flex-col">
			{#if title}
				<h1
					data-slot="wizard-screen-title"
					class="mb-2 text-heading-lg font-semibold text-foreground tablet:text-heading-xl"
				>
					{title}
				</h1>
			{/if}
			{#if subtitle}
				<p
					data-slot="wizard-screen-subtitle"
					class="mb-6 text-body-lg text-muted-foreground tablet:text-title-xs tablet:font-normal"
				>
					{subtitle}
				</p>
			{/if}
			{@render children()}
		</div>
	</main>

	<div
		data-slot="wizard-screen-bar"
		class={cn('fixed inset-x-0 bottom-0 z-40 bg-card', !progress && 'border-t border-border')}
	>
		{#if progress}
			<StepProgress
				steps={progress.steps}
				currentStep={progress.currentStep}
				progress={progress.fill}
				aria-label={progress.label}
				data-testid={testId ? `${testId}-progress` : undefined}
			/>
		{/if}
		{#if footer}
			<div
				data-slot="wizard-screen-footer"
				class="px-5 pt-3 pb-safe-area-action tablet:px-gutter-lg"
			>
				{@render footer()}
			</div>
		{:else if back && next}
			<ActionBar
				secondaryAppearance="link"
				secondaryLabel={back.label}
				onSecondaryClick={back.onClick}
				secondaryDisabled={back.disabled}
				secondaryTestId={back.testId}
				primaryShape="pill"
				primaryTone="accent"
				primaryLabel={next.label}
				onPrimaryClick={next.onClick}
				primaryDisabled={next.disabled}
				primaryLoading={next.loading}
				primaryTestId={next.testId}
				hover={false}
				class="tablet:px-gutter-lg"
			/>
		{/if}
	</div>
</div>

<!-- A pill: the visible 36 (40 from 744) inside its 48 target, 13/500 (14 from 744) on a 1 px line, 12 a side below 360;
     no fill on hover (U-100); a locked one at half strength, as a locked button (`primitives/button`). Its name is
     `label` at every width, so the shorter words below 744 never rename it. -->
{#snippet pillOf(pill: WizardScreenPill)}
	{#if pill.href}
		<a
			href={pill.href}
			aria-label={pill.label}
			data-slot="wizard-screen-pill"
			data-testid={pill.testId}
			class={pillClass}
			onclick={pill.onClick}
		>
			{@render pillFace(pill)}
		</a>
	{:else}
		<button
			type="button"
			aria-label={pill.label}
			data-slot="wizard-screen-pill"
			data-testid={pill.testId}
			class={pillClass}
			disabled={pill.disabled}
			onclick={pill.onClick}
		>
			{@render pillFace(pill)}
		</button>
	{/if}
{/snippet}

{#snippet pillFace(pill: WizardScreenPill)}
	<span
		data-slot="wizard-screen-pill-face"
		class="inline-flex h-wizard-pill items-center gap-1.5 rounded-full border border-border px-3.5 text-label-lg font-medium whitespace-nowrap text-foreground group-focus-visible:ring-3 group-focus-visible:ring-ring/50 tablet:h-control-sm tablet:px-4 tablet:text-body-sm narrow-phone:px-3"
	>
		{#if pill.icon}
			<Ionicon name={pill.icon} class="icon-sm text-foreground" />
		{/if}
		{#if pill.shortLabel}
			<!-- `doctor.css` below 360: a pill with a glyph keeps only the glyph (its name stays the `label`). -->
			<span aria-hidden="true" class={cn('tablet:hidden', pill.icon && 'narrow-phone:hidden')}
				>{pill.shortLabel}</span
			>
			<span aria-hidden="true" class="hidden tablet:inline">{pill.label}</span>
		{:else}
			<span aria-hidden="true">{pill.label}</span>
		{/if}
	</span>
{/snippet}
