<script lang="ts" module>
	import type { FieldSize } from '$shared/ui/primitives/floating-label';

	export type ComboboxSize = FieldSize;
	export type ComboboxOption = { label: string; value: string; icon?: string };

	// Greek-accent folding so search is diacritics-insensitive (1:1 with the Vue
	// combobox). Length-preserving (one char in → one char out) so highlight
	// indices map back onto the original label.
	const ACCENTS: Record<string, string> = {
		ά: 'α',
		έ: 'ε',
		ή: 'η',
		ί: 'ι',
		ϊ: 'ι',
		ΐ: 'ι',
		ό: 'ο',
		ύ: 'υ',
		ϋ: 'υ',
		ΰ: 'υ',
		ώ: 'ω'
	};
	function normalize(input: string): string {
		return input
			.toLowerCase()
			.split('')
			.map((c) => ACCENTS[c] ?? c)
			.join('');
	}
	function searchWords(query: string): string[] {
		return normalize(query)
			.split(/[\s,]+/)
			.filter(Boolean);
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { useId, dismissable, Presence } from '$shared/lib/headless';
	import { FloatingLabel } from '$shared/ui/primitives/floating-label';
	import { fieldSizes } from '$shared/ui/primitives/input';
	import type { FieldApi } from '$shared/lib/form';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		label,
		value = $bindable(''),
		options,
		field,
		id,
		size = 'default',
		error,
		disabled = false,
		placeholder = '',
		allowFreeText = true,
		searchIcon = false,
		chevron = true,
		emptyText,
		clearLabel,
		toggleLabel,
		name,
		class: className
	}: {
		label: string;
		/** Selected option value (or free text when `allowFreeText`). */
		value?: string;
		options: ComboboxOption[];
		field?: FieldApi<string>;
		id?: string;
		size?: ComboboxSize;
		error?: string;
		disabled?: boolean;
		placeholder?: string;
		/** Allow committing typed text that matches no option (default true, 1:1 Vue). */
		allowFreeText?: boolean;
		/** Show the leading search icon (off by default, the application's look, U-07.3); off, the input and the label start at the edge. */
		searchIcon?: boolean;
		/** Show the trailing toggle/clear button (chevron when empty, clear when filled). */
		chevron?: boolean;
		/** What the list says when nothing matches, already localized (the application's `emptyText`). */
		emptyText: string;
		/** Names of the trailing button: clearing the text, or opening the options. */
		clearLabel: string;
		toggleLabel: string;
		name?: string;
		class?: string;
	} = $props();

	// Reserve fixed space for the leading icon / trailing button when shown,
	// otherwise fall back to the size's natural horizontal padding.
	const leadPad = $derived(searchIcon ? 'pl-field-inset' : fieldSizes[size].start);
	const trailPad = $derived(chevron ? 'pr-touch' : fieldSizes[size].end);

	const inputId = useId(untrack(() => id) ?? undefined, 'combobox');
	const listId = `${inputId}-list`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	let search = $state('');
	let open = $state(false);
	let highlighted = $state(-1);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLUListElement | null>(null);
	// The list stays until its CSS leave ends (U-12.2): it grows from 95 % as it fades in, and back out.
	const presence = new Presence(() => open, { duration: 'standard' });
	// Placeholder only while focused (1:1 with the Vue combobox).
	let placeholderText = $state(' ');
	let focused = $state(false);
	// The application's `floated = focused || hasValue` (R3-3) over the typed text; autofill floats it by CSS.
	const floated = $derived(focused || search !== '');

	// Keep the visible text in sync with EXTERNAL value changes only (untrack so
	// typing — which writes `value` — never fights the input).
	let lastValue: string | null = null;
	$effect(() => {
		const v = currentValue;
		untrack(() => {
			if (v === lastValue) return;
			lastValue = v;
			const opt = options.find((o) => o.value === v);
			search = opt ? opt.label : (v ?? '');
		});
	});

	const filtered = $derived.by(() => {
		const words = searchWords(search);
		if (words.length === 0) return options;
		return options.filter((o) => {
			const n = normalize(o.label);
			return words.every((w) => n.includes(w));
		});
	});

	function emit(next: string) {
		lastValue = next;
		if (field) field.setValue(next);
		else value = next;
	}

	function onInput() {
		open = true;
		highlighted = -1;
		const match = options.find((o) => o.label === search);
		if (match) emit(match.value);
		else emit(allowFreeText ? search : '');
	}

	function selectOption(option: ComboboxOption) {
		search = option.label;
		emit(option.value);
		open = false;
		inputEl?.focus();
	}

	function move(direction: 1 | -1) {
		const n = filtered.length;
		if (n === 0) return;
		highlighted = (highlighted + direction + n) % n;
		listEl?.querySelectorAll<HTMLElement>('[role="option"]')[highlighted]?.scrollIntoView({
			block: 'nearest'
		});
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			open = true;
			move(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			open = true;
			move(-1);
		} else if (event.key === 'Enter') {
			if (open && highlighted >= 0 && filtered[highlighted]) {
				event.preventDefault();
				selectOption(filtered[highlighted]);
			}
		} else if (event.key === 'Escape') {
			open = false;
		}
	}

	function onButton() {
		if (disabled) return;
		if (search) {
			search = '';
			emit('');
			open = false;
		} else {
			open = !open;
		}
		inputEl?.focus();
	}

	function onFocus() {
		focused = true;
		open = true;
		placeholderText = placeholder || ' ';
	}

	function onBlur() {
		focused = false;
		placeholderText = ' ';
		field?.handleBlur();
	}

	// Split an option label into matched / unmatched segments for highlighting.
	function segments(text: string): { text: string; match: boolean }[] {
		const words = searchWords(search);
		if (words.length === 0) return [{ text, match: false }];
		const norm = normalize(text);
		const flags = new Array(text.length).fill(false);
		for (const w of words) {
			let idx = norm.indexOf(w);
			while (idx !== -1) {
				for (let i = idx; i < idx + w.length; i++) flags[i] = true;
				idx = norm.indexOf(w, idx + 1);
			}
		}
		const out: { text: string; match: boolean }[] = [];
		let cur = '';
		let curMatch = flags[0] ?? false;
		for (let i = 0; i < text.length; i++) {
			if (flags[i] === curMatch) cur += text[i];
			else {
				out.push({ text: cur, match: curMatch });
				cur = text[i];
				curMatch = flags[i];
			}
		}
		if (cur) out.push({ text: cur, match: curMatch });
		return out;
	}
</script>

<div
	class={cn('relative w-full pb-1', className)}
	data-slot="combobox"
	use:dismissable={{ enabled: open, onDismiss: () => (open = false) }}
>
	<div class="relative">
		{#if searchIcon}
			<Ionicon
				name="search"
				class="pointer-events-none absolute top-1/2 left-3 icon-sm -translate-y-1/2 text-muted-foreground"
			/>
		{/if}

		<input
			bind:this={inputEl}
			id={inputId}
			{name}
			{disabled}
			placeholder={placeholderText}
			bind:value={search}
			role="combobox"
			aria-expanded={open}
			aria-controls={listId}
			aria-autocomplete="list"
			autocomplete="off"
			aria-invalid={currentError ? 'true' : undefined}
			oninput={onInput}
			onfocus={onFocus}
			onkeydown={onKeydown}
			onblur={onBlur}
			data-slot="combobox-input"
			class={cn(
				'peer block w-full appearance-none rounded-md border border-input bg-card text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-muted-foreground focus:border-ring',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/10',
				fieldSizes[size].input,
				leadPad,
				trailPad
			)}
		/>

		<!-- With the search icon the label stays clear of it floated too (the web's look, kept by `class`). -->
		<FloatingLabel
			for={inputId}
			data-slot="combobox-label"
			{label}
			{floated}
			{focused}
			error={Boolean(currentError)}
			{size}
			class={searchIcon ? 'left-field-inset' : undefined}
		/>

		{#if chevron}
			<button
				type="button"
				tabindex={-1}
				{disabled}
				onclick={onButton}
				aria-label={search ? clearLabel : toggleLabel}
				class="absolute top-1/2 right-0 grid size-touch -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50"
			>
				<!-- The application's trailing glyph is `icon.md` (20). -->
				{#if search}<Ionicon name="close" class="icon-md" />{:else}<Ionicon
						name="chevron-down"
						class="icon-md"
					/>{/if}
			</button>
		{/if}
	</div>

	{#if presence.present}
		<ul
			bind:this={listEl}
			use:presence.track
			id={listId}
			role="listbox"
			data-state={presence.state}
			inert={presence.closing}
			class="absolute z-50 mt-1 max-h-menu-max-h w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay transition-[opacity,scale] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:scale-95 data-[state=closed]:opacity-0 starting:scale-95 starting:opacity-0"
		>
			{#each filtered as option, i (option.value)}
				<li
					role="option"
					aria-selected={currentValue === option.value}
					onmousedown={(e) => {
						e.preventDefault();
						selectOption(option);
					}}
					onmouseenter={() => (highlighted = i)}
					class={cn(
						'flex min-h-touch w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-body-lg',
						i === highlighted && 'bg-muted'
					)}
				>
					{#if option.icon}
						<span class="grid size-6 flex-none place-items-center rounded-md bg-muted">●</span>
					{/if}
					<span class="truncate">
						{#each segments(option.label) as seg, si (si)}<span
								class={seg.match ? 'font-semibold' : ''}>{seg.text}</span
							>{/each}
					</span>
				</li>
			{:else}
				<li class="px-3 py-4 text-body-sm text-muted-foreground select-none">
					{emptyText}
				</li>
			{/each}
		</ul>
	{/if}

	{#if currentError}
		<p data-slot="combobox-error" class="mt-1 text-body-sm text-danger-text">{currentError}</p>
	{/if}
</div>
