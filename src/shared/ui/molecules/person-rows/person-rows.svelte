<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * One person to choose: the name (its first letters fill the circle), the muted lines under it, a quiet word that
	 * holds for them (`note`, drawn in the text's colour); `glyph` draws a sign in the circle instead of the initials (an
	 * action among the people: «a new one»); `href` makes the row a link to the person's page (a list of people).
	 */
	export type PersonRow = {
		id: string;
		name: string;
		lines?: readonly string[];
		note?: string | null;
		glyph?: IoniconName;
		href?: string;
	};

	/**
	 * `framed`: the rows of a choice inside a frame (screen 72's search); `lines`: a list of people between thin lines, the
	 * 55's rows (screen 73 «Οι ασθενείς μου», D-W51-74) — the circle 48, the name 16, the row of the open person filled
	 * from 1128 (where the list stands beside it).
	 */
	export type PersonRowsLook = 'framed' | 'lines';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { visitInitials } from '$shared/ui/molecules/visit-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';

	let {
		rows,
		onSelect,
		look = 'framed',
		selectedId = null,
		label,
		labelledby,
		testId,
		class: className
	}: {
		rows: readonly PersonRow[];
		/** A press on a row: its `id` (and the press, so a link may open in place). */
		onSelect?: (id: string, event: MouseEvent) => void;
		look?: PersonRowsLook;
		/** The person open beside the list (`lines`, from 1128): its row filled, `aria-current`. */
		selectedId?: string | null;
		/** The list's name when no heading on the screen says it (one of the two names). */
		label?: string;
		labelledby?: string;
		testId?: string;
		class?: string;
	} = $props();

	const lines = $derived(look === 'lines');
	const rowClass = $derived(
		cn(
			'group flex min-h-row-lg w-full flex-row items-center gap-3 text-start outline-none',
			lines ? 'py-3' : 'py-2.5'
		)
	);
</script>

<!-- `64-switch/sw.css:237-244` (`.w-prow`, D-W51-03: the row of a person with the initials, screens 72, 73, 74): framed
     rows of the whole width (72) between thin lines — the circle 40 with the initials (a sign on the chip's fill for an
     action), the name 15/600, the muted lines 13, a quiet word in the text's colour, «›» at the end. `lines` (`sw.css:263-265`
     `.w-ptrow`, the 55's `.r-row`): no frame, a line under each row, the circle 48 and the name 16; the open person's row
     on the chip's fill from 1128. Each row is ONE press (a link with `href`). No colour under the pointer (U-100). Every
     word a text node (U-65.6). -->
<ul
	data-slot="person-rows"
	data-look={look}
	data-testid={testId}
	aria-label={labelledby ? undefined : label}
	aria-labelledby={labelledby}
	class={cn(
		lines ? 'flex flex-col' : 'flex flex-col rounded-md border border-line-2 px-4',
		className
	)}
>
	{#each rows as row, index (row.id)}
		{@const selected = selectedId === row.id}
		<li
			class={cn(
				lines ? 'border-b border-line' : index > 0 && 'border-t border-border',
				lines &&
					selected &&
					'laptop:-mx-3 laptop:rounded-md laptop:border-transparent laptop:bg-chip laptop:px-3'
			)}
		>
			{#snippet content()}
				{#if row.glyph}
					<span
						aria-hidden="true"
						class="flex size-avatar-md shrink-0 items-center justify-center rounded-full bg-chip text-foreground"
					>
						<Ionicon name={row.glyph} class="icon-md" />
					</span>
				{:else}
					<Avatar size={lines ? 'lg' : 'md'} class="shrink-0" aria-hidden="true">
						<AvatarFallback
							class={cn('font-semibold text-foreground', lines ? 'text-body-md' : 'text-body-sm')}
							>{visitInitials(row.name)}</AvatarFallback
						>
					</Avatar>
				{/if}
				<span
					class="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xs group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
				>
					<span class={cn('font-semibold text-foreground', lines ? 'text-body-lg' : 'text-body-md')}
						>{row.name}</span
					>
					{#each row.lines ?? [] as line, at (at)}
						<span class="text-label-lg font-normal text-muted-foreground">{line}</span>
					{/each}
					{#if row.note}
						<span data-slot="person-rows-note" class="text-label-lg font-normal text-foreground"
							>{row.note}</span
						>
					{/if}
				</span>
				<Ionicon
					name="chevron-forward"
					class="icon-md shrink-0 text-muted-foreground"
					aria-hidden="true"
				/>
			{/snippet}
			{#if row.href}
				<!-- The caller's address, already resolved (the shared code knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={row.href}
					data-slot="person-rows-row"
					data-id={row.id}
					data-selected={selected || undefined}
					aria-current={selected ? 'page' : undefined}
					class={rowClass}
					onclick={(event) => onSelect?.(row.id, event)}
				>
					{@render content()}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{:else}
				<button
					type="button"
					data-slot="person-rows-row"
					data-id={row.id}
					class={rowClass}
					onclick={(event) => onSelect?.(row.id, event)}
				>
					{@render content()}
				</button>
			{/if}
		</li>
	{/each}
</ul>
