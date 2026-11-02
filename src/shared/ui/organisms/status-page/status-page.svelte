<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import type { StatusArtName } from './status-art.svelte';

	/** One of the page's ways on (Airbnb's «helpful links»). */
	export type StatusPageLink = { label: string; href: string };

	/** A way on drawn as a button: a link (`href`) or a press (`onPress`, a retry). */
	export type StatusPageAction = {
		label: string;
		href?: string;
		onPress?: () => void;
		testId?: string;
	};

	export type StatusPageProps = {
		/** The decorative exclamation over the title from 744 (U-61.2 Ε1: «Ωχ!», the web only); never read out. */
		oops?: string;
		/** Below 744, the kit's state glyph over the title (the application's `StateGlyph`). */
		glyph?: IoniconName;
		/** The page's one heading: what happened, as a sentence. */
		title: string;
		/** The heading's tag (`h1` on a page of its own); the look stays. */
		titleAs?: 'h1' | 'h2';
		/** The line under it. */
		text?: string;
		/** From 744, the code line written whole by the caller («Κωδικός σφάλματος: 404»). */
		codeLabel?: string;
		/** From 744: the first a dark pill, the next ones outline pills. */
		actions?: readonly StatusPageAction[];
		/** Below 744 (the application's state pattern): the first a dark button, the second a text button. */
		phoneActions?: readonly StatusPageAction[];
		/** From 744, the words over the links («Ίσως σας βοηθήσουν:») and the links, one per line. */
		linksTitle?: string;
		links?: readonly StatusPageLink[];
		/** From 744, the picture beside the words (from 1128) or under them. */
		art?: StatusArtName;
		testId?: string;
		/** The status the page shows (`data-status`, for a test or a reader of the page). */
		status?: number;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import StatusArt from './status-art.svelte';

	let {
		oops,
		glyph,
		title,
		titleAs = 'h1',
		text,
		codeLabel,
		actions = [],
		phoneActions = [],
		linksTitle,
		links = [],
		art,
		testId,
		status,
		class: className
	}: StatusPageProps = $props();

	const linksId = $props.id();
	const [phonePrimary, phoneSecondary] = $derived(phoneActions);
</script>

<!-- 🔴 U-61.1 (the prototype 09, ONE component, the pages differ only in what they pass): from 744 the web's page —
     «Ωχ!» (48, decorative), the sentence as the h1 (28, regular), its line, the code, the buttons, «Ίσως σας
     βοηθήσουν:» and the links, our picture beside the words from 1128 (under them at 744–1127); below 744 the
     application's state pattern — the glyph in its 56 disc, the title (20/600), the line, a dark button and a text
     button. The zones are CSS only (U-03.1). -->
<section
	data-slot="status-page"
	data-testid={testId}
	data-status={status}
	class={cn(
		'flex min-h-page w-full items-center px-gutter-sm py-section-lg tablet:px-profile-gutter laptop:px-profile-gutter-lg',
		className
	)}
>
	<div
		class={cn(
			'mx-auto grid w-full max-w-form grid-cols-1 gap-section-lg',
			art &&
				'laptop:max-w-listing laptop:grid-cols-[minmax(0,var(--container-form))_minmax(0,1fr)] laptop:items-center'
		)}
	>
		<div
			data-slot="status-page-words"
			class="flex flex-col items-center text-center tablet:items-start tablet:text-left"
		>
			{#if glyph}
				<span
					data-slot="status-page-glyph"
					class="mb-4 grid size-tile place-items-center rounded-full bg-foreground/5 tablet:hidden"
				>
					<Ionicon name={glyph} class="icon-lg text-foreground" />
				</span>
			{/if}
			{#if oops}
				<p aria-hidden="true" class="hidden text-display-xl text-foreground tablet:block">
					{oops}
				</p>
			{/if}
			<svelte:element
				this={titleAs}
				class="text-title-lg text-balance text-foreground tablet:mt-4 tablet:text-heading-lg tablet:font-normal"
			>
				{title}
			</svelte:element>
			{#if text}
				<p
					class="mt-2 max-w-narrow text-body-md text-muted-foreground tablet:mt-3 tablet:max-w-none tablet:text-body-lg"
				>
					{text}
				</p>
			{/if}
			{#if codeLabel}
				<p
					data-slot="status-page-code"
					class="mt-4 hidden text-body-sm font-semibold text-muted-foreground tablet:block"
				>
					{codeLabel}
				</p>
			{/if}

			{#if phonePrimary}
				<div
					data-slot="status-page-phone-actions"
					class="mt-4 flex flex-col items-center gap-1 tablet:hidden"
				>
					<Button
						tone="contrast"
						label={phonePrimary.label}
						href={phonePrimary.href}
						onclick={phonePrimary.onPress}
						textClass="text-body-md"
						data-testid={phonePrimary.testId}
					/>
					{#if phoneSecondary}
						<TextButton
							label={phoneSecondary.label}
							href={phoneSecondary.href}
							onclick={phoneSecondary.onPress}
							tone="foreground"
							underline
							data-testid={phoneSecondary.testId}
						/>
					{/if}
				</div>
			{/if}

			{#if actions.length > 0}
				<div
					data-slot="status-page-actions"
					class="mt-6 hidden flex-row flex-wrap gap-3 tablet:flex"
				>
					{#each actions as action, index (action.label)}
						<Button
							tone={index === 0 ? 'contrast' : 'outline'}
							radius="full"
							label={action.label}
							href={action.href}
							onclick={action.onPress}
							textClass="text-body-md"
							data-testid={action.testId}
						/>
					{/each}
				</div>
			{/if}

			{#if links.length > 0}
				<nav
					aria-labelledby={linksTitle ? linksId : undefined}
					data-slot="status-page-links"
					class="mt-6 hidden flex-col tablet:flex"
				>
					{#if linksTitle}
						<p id={linksId} class="text-body-sm text-foreground/85">{linksTitle}</p>
					{/if}
					<ul class="mt-1 flex flex-col">
						{#each links as link (link.href)}
							<li>
								<a
									href={link.href}
									class="inline-flex min-h-touch min-w-touch items-center rounded-sm text-body-lg text-primary-text outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
									>{link.label}</a
								>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
		</div>

		{#if art}
			<div data-slot="status-page-art" class="hidden justify-center tablet:flex">
				<StatusArt name={art} class="max-w-popover-lg laptop:max-w-status-art" />
			</div>
		{/if}
	</div>
</section>
