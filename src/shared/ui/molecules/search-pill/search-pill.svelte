<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** One suggestion: its words (the matching parts bold), a muted line, and a 56 tile (a photo or a glyph). */
	export type SearchPillOption = {
		id: string;
		title: string;
		subtitle?: string;
		image?: string;
		icon?: IoniconName;
	};

	/** A titled group of suggestions («Υπηρεσίες», «Άρθρα»). */
	export type SearchPillGroup = { id: string; label: string; options: readonly SearchPillOption[] };

	export type SearchPillProps = {
		/** The words in the field (bind it). */
		value?: string;
		/** The placeholder, also the field's name read aloud. */
		placeholder: string;
		clearLabel: string;
		submitLabel: string;
		/** The suggestions' landmark name. */
		listLabel: string;
		/** The suggestions for the words in the field; the panel opens from `minChars`. */
		groups?: readonly SearchPillGroup[];
		/** Under the groups, a row that runs the search («Όλα τα αποτελέσματα (N)»). */
		allLabel?: string;
		/** Shown in the panel when the groups are empty and `ready` is true («Δεν βρέθηκαν αποτελέσματα»). */
		emptyLabel?: string;
		/** Whether the groups answer the words typed (false while they load: the panel waits, it never says «none»). */
		ready?: boolean;
		/** Whether suggestions exist at all (a field without them only submits). */
		suggests?: boolean;
		minChars?: number;
		/** The words changed (typing or clearing). */
		onInput?: (value: string) => void;
		/** Enter or the magnifier without a chosen suggestion: the search runs. */
		onSubmit: (value: string) => void;
		/** A suggestion was chosen (pointer or Enter). */
		onPick?: (option: SearchPillOption, group: SearchPillGroup) => void;
		/** The «×»: the words are gone (the caller clears the results too). */
		onClear?: () => void;
		/**
		 * What the address keeps beside the words when the form is sent without JavaScript (`type`, `service`,
		 * `topic`): one hidden field per name with a value.
		 */
		keep?: Readonly<Record<string, string | null | undefined>>;
		testId?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { foldSearchText, highlightSearch, searchWords } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		value = $bindable(''),
		placeholder,
		clearLabel,
		submitLabel,
		listLabel,
		groups = [],
		allLabel,
		emptyLabel,
		ready = true,
		suggests = true,
		minChars = 2,
		onInput,
		onSubmit,
		onPick,
		onClear,
		keep = {},
		testId,
		class: className
	}: SearchPillProps = $props();

	const ids = $props.id();
	const listboxId = `${ids}-list`;
	const allId = `${ids}-all`;
	let input = $state<HTMLInputElement | null>(null);
	let form = $state<HTMLFormElement | null>(null);
	let expanded = $state(false);
	let active = $state(-1);

	const words = $derived(searchWords(value));
	const long = $derived(foldSearchText(value).replace(/\s/gu, '').length >= minChars);
	const flat = $derived(
		groups.flatMap((group) =>
			group.options.map((option) => ({ group, option, id: `${ids}-${group.id}-${option.id}` }))
		)
	);
	const rows = $derived([
		...flat.map((row) => row.id),
		...(allLabel && flat.length ? [allId] : [])
	]);
	const nothing = $derived(ready && flat.length === 0);
	const kept = $derived(
		Object.entries(keep).filter((entry): entry is [string, string] => Boolean(entry[1]))
	);
	const open = $derived(
		suggests && expanded && long && (flat.length > 0 || (nothing && Boolean(emptyLabel)))
	);
	const activeId = $derived(open && active >= 0 ? rows[active] : undefined);

	function typed(event: Event & { currentTarget: HTMLInputElement }) {
		value = event.currentTarget.value;
		expanded = true;
		active = -1;
		onInput?.(value);
	}

	function clear() {
		value = '';
		active = -1;
		onInput?.('');
		onClear?.();
		input?.focus();
	}

	function close() {
		expanded = false;
		active = -1;
	}

	function pick(index: number) {
		const row = flat[index];
		close();
		if (row) onPick?.(row.option, row.group);
		else onSubmit(value.trim());
	}

	function submit(event?: SubmitEvent) {
		event?.preventDefault();
		if (open && active >= 0) {
			pick(active);
			return;
		}
		close();
		onSubmit(value.trim());
	}

	function keydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			expanded = true;
			if (!rows.length) return;
			const step = event.key === 'ArrowDown' ? 1 : -1;
			active = (active + step + rows.length) % rows.length;
			document.getElementById(rows[active])?.scrollIntoView({ block: 'nearest' });
		} else if (event.key === 'Escape' && open) {
			event.stopPropagation();
			close();
		}
	}

	function focusout(event: FocusEvent) {
		const next = event.relatedTarget;
		if (next instanceof Node && form?.contains(next)) return;
		close();
	}
</script>

<!-- 🔴 U-57.3 / U-60.1 (common v2 §D, the prototypes 06 v3 and 08): the list's search pill — from 744 the web's (56,
     480 wide, the clear «×» while there are words, the accent magnifier that runs the search); below 744 the
     application's `SearchField` `inset` pill (U-58.1, U-60.2: the magnifier at 16, the words from 44, the «⊗» at 4 from
     the right, Enter runs the search). Its suggestions from two characters (↑↓ choose, Enter opens the chosen or runs
     the search, Esc closes), in a panel as wide as the field that opens on 0.2 s; a combobox: the focus stays in the
     field, the options in their groups (the APG grouped listbox), «none» a status beside them (MINOR-3 of r1). -->
<form
	bind:this={form}
	role="search"
	autocomplete="off"
	data-slot="search-pill"
	data-testid={testId}
	onsubmit={submit}
	onfocusout={focusout}
	class={cn('relative mx-auto w-full max-w-text text-left', className)}
>
	{#each kept as [name, keptValue] (name)}
		<input type="hidden" {name} value={keptValue} />
	{/each}
	<div
		data-slot="search-pill-field"
		class="flex h-control-md flex-row items-center gap-2 rounded-full border border-input bg-card pr-1 pl-4 transition-[border-color,box-shadow] duration-label ease-standard focus-within:border-foreground focus-within:ring-1 focus-within:ring-foreground focus-within:ring-inset tablet:h-control-lg tablet:gap-0.5 tablet:border-foreground/10 tablet:pr-2 tablet:pl-6 tablet:shadow-raised"
	>
		<Ionicon
			name="search"
			data-slot="search-pill-glyph"
			class="icon-md shrink-0 text-muted-foreground tablet:hidden"
		/>
		<input
			bind:this={input}
			type="search"
			name="q"
			{value}
			{placeholder}
			aria-label={placeholder}
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-activedescendant={activeId}
			enterkeyhint="search"
			spellcheck="false"
			oninput={typed}
			onfocus={() => (expanded = true)}
			onkeydown={keydown}
			class="h-full min-h-touch w-full min-w-touch flex-1 bg-transparent text-body-lg text-ellipsis text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
		/>
		{#if value}
			<button
				type="button"
				aria-label={clearLabel}
				data-slot="search-pill-clear"
				onclick={clear}
				class="grid size-touch shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="close-circle" class="icon-md text-muted-foreground tablet:hidden" />
				<span
					class="hidden size-6 place-items-center rounded-full bg-muted-foreground/20 text-foreground tablet:grid"
				>
					<Ionicon name="close" class="icon-xs" />
				</span>
			</button>
		{/if}
		<button
			type="submit"
			aria-label={submitLabel}
			data-slot="search-pill-submit"
			class="group hidden size-touch shrink-0 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:grid"
		>
			<span
				class="grid size-control-sm place-items-center rounded-full bg-accent text-primary-foreground transition-transform duration-label ease-standard group-active:scale-95"
			>
				<Ionicon name="search" class="icon-sm" />
			</span>
		</button>
	</div>

	<div
		data-slot="search-pill-panel"
		data-state={open ? 'open' : 'closed'}
		aria-hidden={open ? undefined : 'true'}
		class="absolute inset-x-0 top-full z-40 mt-2 max-h-sheet-sm overflow-y-auto overscroll-contain rounded-xl bg-card p-2 shadow-soft transition-[opacity,translate] duration-label ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:-translate-y-1 data-[state=closed]:opacity-0 tablet:rounded-panel"
	>
		<div
			id={listboxId}
			role="listbox"
			aria-label={listLabel}
			aria-hidden={open && flat.length > 0 ? undefined : 'true'}
			data-slot="search-pill-list"
		>
			{#if open}
				{#each groups as group (group.id)}
					{#if group.options.length > 0}
						{@const groupLabelId = `${ids}-${group.id}-label`}
						<ul role="group" aria-labelledby={groupLabelId} data-slot="search-pill-group">
							<li
								id={groupLabelId}
								role="presentation"
								class="px-3 pt-3 pb-1.5 text-label-md font-semibold text-muted-foreground"
							>
								{group.label}
							</li>
							{#each group.options as option (option.id)}
								{@const rowId = `${ids}-${group.id}-${option.id}`}
								{@const index = flat.findIndex((row) => row.id === rowId)}
								<li
									id={rowId}
									role="option"
									aria-selected={activeId === rowId}
									data-slot="search-pill-option"
									onpointerdown={(event) => event.preventDefault()}
									tabindex="-1"
									onclick={() => pick(index)}
									onkeydown={() => undefined}
									class={cn(
										'flex min-h-row-lg w-full cursor-pointer flex-row items-center gap-3.5 rounded-lg px-3 py-2 can-hover:hover:bg-background',
										activeId === rowId && 'bg-background'
									)}
								>
									<span
										class="relative grid size-tile shrink-0 place-items-center overflow-hidden rounded-md bg-muted-foreground/8 text-foreground/85"
									>
										{#if option.image}
											<img src={option.image} alt="" class="size-full object-cover" />
										{:else}
											<Ionicon name={option.icon ?? 'search'} class="icon-lg" />
										{/if}
									</span>
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="line-clamp-2 text-body-md text-foreground"
											>{#each highlightSearch(option.title, words) as run, runIndex (runIndex)}{#if run.match}<strong
														class="font-bold">{run.text}</strong
													>{:else}{run.text}{/if}{/each}</span
										>
										{#if option.subtitle}
											<span class="truncate text-body-sm text-muted-foreground"
												>{option.subtitle}</span
											>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
				{#if allLabel && flat.length > 0}
					<div
						id={allId}
						role="option"
						aria-selected={activeId === allId}
						data-slot="search-pill-all"
						onpointerdown={(event) => event.preventDefault()}
						tabindex="-1"
						onclick={() => pick(flat.length)}
						onkeydown={() => undefined}
						class={cn(
							'flex min-h-touch w-full cursor-pointer flex-row items-center rounded-lg px-3 text-body-md font-semibold text-foreground underline can-hover:hover:bg-background',
							activeId === allId && 'bg-background'
						)}
					>
						{allLabel}
					</div>
				{/if}
			{/if}
		</div>
		{#if open && nothing && emptyLabel}
			<p
				role="status"
				data-slot="search-pill-none"
				class="px-3 py-3.5 text-body-sm text-muted-foreground"
			>
				{emptyLabel}
			</p>
		{/if}
	</div>
</form>
