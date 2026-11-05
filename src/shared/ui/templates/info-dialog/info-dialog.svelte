<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * U-75 (screen 24 Π3): a row of a group: its glyph, its label, a line under it, and a way on from that line (a
	 * `tel:`, the caller's checked address).
	 */
	export type InfoDialogRow = {
		key: string;
		icon: IoniconName;
		label: string;
		sub?: string;
		link?: { label: string; href: string };
	};
	/** One section: a small title (optional) over its words, or over rows with a line above them. */
	export type InfoDialogBlock =
		| { heading?: string; text: string; rows?: undefined; intro?: undefined }
		| { heading?: string; rows: readonly InfoDialogRow[]; intro?: string; text?: undefined };
	/** One way on, under the text: a page of the site. */
	export type InfoDialogLink = { label: string; href: string; testId?: string };
	/** A run of the line under the title; `emphasis` the words that stand out («**Nikis 12**»). */
	export type InfoDialogRun = { text: string; emphasis?: boolean };
</script>

<script lang="ts">
	import { SheetDrag, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';

	let {
		open = $bindable(false),
		title,
		intro = [],
		blocks,
		links = [],
		closeLabel,
		testId
	}: {
		open?: boolean;
		title: string;
		/** The muted line under the title. */
		intro?: readonly InfoDialogRun[];
		blocks: readonly InfoDialogBlock[];
		links?: readonly InfoDialogLink[];
		closeLabel: string;
		testId?: string;
	} = $props();

	const titleId = useId(undefined, 'info-dialog-title');
	const close = () => (open = false);

	let scroller = $state<HTMLElement | null>(null);
	let stuck = $state(false);
	const drag = new SheetDrag(close);
	const { onpointerdown, onpointermove, onpointerup, onpointercancel } = drag;
</script>

<!-- 🔴 U-67.1 (screen 12): a title, its text, the links; the SECOND level over another window, which stays locked and
     keeps its place. One element, two shapes by CSS: from 744 the small window (568, the 32 corner), below 744 the
     application's sheet as tall as its content, with its handle, dragged down to close; its own backdrop over the first
     window. Focus stays in it, Escape closes only it, and the focus goes back to the link that opened it. Its words are
     text (U-65.6). -->
<ModalScreenSurface
	bind:open
	shape="sheet"
	tone="card"
	onDismiss={close}
	aria-labelledby={titleId}
	data-slot="info-dialog"
	data-testid={testId}
	data-dragging={drag.dragged !== null || undefined}
	style={drag.dragged ? `transform: translateY(${drag.dragged}px)` : undefined}
	class={cn(
		'max-tablet:top-auto max-tablet:h-fit max-tablet:max-h-sheet-xl',
		drag.dragged !== null && 'transition-none'
	)}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		data-slot="info-dialog-bar"
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onpointercancel}
		class={cn(
			'relative h-control-lg shrink-0 touch-none transition-colors duration-label ease-standard tablet:h-bar-top tablet:touch-auto',
			stuck && 'border-b border-border/60'
		)}
	>
		<span
			bind:this={drag.handle}
			aria-hidden="true"
			data-slot="info-dialog-handle"
			class="absolute top-2 left-1/2 h-1 w-drawer-handle -translate-x-1/2 rounded-xs bg-muted-foreground/45 tablet:hidden"
		></span>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={closeLabel}
			data-testid={testId ? `${testId}-close` : undefined}
			onclick={close}
			class="absolute top-2 right-4 tablet:top-3"
		/>
	</div>
	<div
		bind:this={scroller}
		onscroll={() => (stuck = (scroller?.scrollTop ?? 0) > 0)}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pb-safe-area-action tablet:pb-section"
	>
		<h2 id={titleId} class="text-heading-sm font-semibold wrap-anywhere text-foreground">
			{title}
		</h2>
		{#if intro.length > 0}
			<p
				data-slot="info-dialog-intro"
				class="mt-2 text-body-sm wrap-anywhere text-muted-foreground"
			>
				{#each intro as run, index (index)}{#if run.emphasis}<span
							class="font-semibold text-foreground">{run.text}</span
						>{:else}{run.text}{/if}{/each}
			</p>
		{/if}
		<div class="mt-6 flex flex-col gap-6 text-body-sm wrap-anywhere text-foreground">
			{#each blocks as block, index (index)}
				<section>
					{#if block.heading}
						<h3 class="text-body-lg font-semibold text-foreground">{block.heading}</h3>
					{/if}
					{#if block.rows}
						{#if block.intro}
							<p class="mt-1 text-muted-foreground">{block.intro}</p>
						{/if}
						<ul data-slot="info-dialog-rows" class="flex flex-col">
							{#each block.rows as row (row.key)}
								<li
									data-testid={testId ? `${testId}-row-${row.key}` : undefined}
									class="flex min-h-control-xl flex-row items-start gap-4 border-b border-border/60 py-4 transition-[translate,opacity] duration-standard ease-standard last:border-b-0 starting:translate-y-1.5 starting:opacity-0"
								>
									<Ionicon name={row.icon} class="icon-lg shrink-0 text-foreground" />
									<div class="min-w-0 flex-1">
										<span class="block text-body-lg text-foreground">{row.label}</span>
										{#if row.sub}
											<span class="mt-1 block text-muted-foreground"
												>{row.link ? `${row.sub} ` : row.sub}{#if row.link}<a
														href={row.link.href}
														data-slot="info-dialog-row-link"
														class="-my-3 inline-flex min-h-touch min-w-touch items-center font-semibold whitespace-nowrap text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
														>{row.link.label}</a
													>{/if}</span
											>
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class={block.heading ? 'mt-1' : undefined}>{block.text}</p>
					{/if}
				</section>
			{/each}
		</div>
		{#if links.length > 0}
			<ul class="mt-2.5 flex flex-col items-start tablet:mt-4.5 tablet:gap-1">
				{#each links as link (link.href)}
					<li>
						<a
							href={link.href}
							data-testid={link.testId}
							class="inline-flex min-h-touch min-w-touch items-center text-body-sm font-semibold text-foreground underline underline-offset-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:-my-2"
							>{link.label}</a
						>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</ModalScreenSurface>
