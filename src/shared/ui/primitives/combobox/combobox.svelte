<script lang="ts" module>
	import type { InputSize } from '$shared/ui/primitives/input';

	export type ComboboxSize = InputSize;
	export type ComboboxOption = { label: string; value: string; icon?: string };

	/**
	 * Floating-label geometry per size (matches the text-field family).
	 * `pl`/`pr`/`labelLeft` are the natural horizontal paddings used when the
	 * leading search icon / trailing chevron are hidden; with them visible the
	 * input reserves fixed `pl-9`/`pr-10` and the label sits at `left-9` instead.
	 */
	const SIZES: Record<
		ComboboxSize,
		{ input: string; label: string; pl: string; pr: string; labelLeft: string }
	> = {
		sm: {
			input: 'pt-3 pb-1 text-xs',
			label: 'top-2.5 text-xs -translate-y-2.5 peer-focus:-translate-y-2.5',
			pl: 'pl-2',
			pr: 'pr-2',
			labelLeft: 'left-2'
		},
		default: {
			input: 'pt-4 pb-1.5 text-sm',
			label: 'top-3 text-sm -translate-y-3 peer-focus:-translate-y-3',
			pl: 'pl-2.5',
			pr: 'pr-2.5',
			labelLeft: 'left-2.5'
		},
		lg: {
			input: 'pt-5 pb-2.5 text-base',
			label: 'top-4 text-base -translate-y-4 peer-focus:-translate-y-4',
			pl: 'pl-2.5',
			pr: 'pr-2.5',
			labelLeft: 'left-2.5'
		},
		xl: {
			input: 'pt-6 pb-3 text-lg',
			label: 'top-5 text-lg -translate-y-5 peer-focus:-translate-y-5',
			pl: 'pl-3',
			pr: 'pr-3',
			labelLeft: 'left-3'
		}
	};

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
	import SearchIcon from '~icons/lucide/search';
	import ChevronDownIcon from '~icons/lucide/chevron-down';
	import XIcon from '~icons/lucide/x';
	import { cn } from '$shared/lib/utils';
	import { useId, dismissable } from '$shared/lib/headless';
	import { m } from '$paraglide/messages.js';
	import type { FieldApi } from '$shared/lib/form';

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
		searchIcon = true,
		chevron = true,
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
		/** Show the leading search icon; when false the input/label start at the edge. */
		searchIcon?: boolean;
		/** Show the trailing toggle/clear button (chevron when empty, clear when filled). */
		chevron?: boolean;
		name?: string;
		class?: string;
	} = $props();

	// Reserve fixed space for the leading icon / trailing button when shown,
	// otherwise fall back to the size's natural horizontal padding.
	const leadPad = $derived(searchIcon ? 'pl-9' : SIZES[size].pl);
	const trailPad = $derived(chevron ? 'pr-10' : SIZES[size].pr);
	const labelLeft = $derived(searchIcon ? 'left-9' : SIZES[size].labelLeft);

	const inputId = useId(untrack(() => id) ?? undefined, 'combobox');
	const listId = `${inputId}-list`;

	const currentValue = $derived(field ? (field.value ?? '') : value);
	const currentError = $derived(field ? field.error : error);

	let search = $state('');
	let open = $state(false);
	let highlighted = $state(-1);
	let inputEl = $state<HTMLInputElement | null>(null);
	let listEl = $state<HTMLUListElement | null>(null);
	// Placeholder only while focused (1:1 with the Vue combobox); a space otherwise
	// so the floating label's `:placeholder-shown` mechanism keeps working.
	let placeholderText = $state(' ');

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
		open = true;
		placeholderText = placeholder || ' ';
	}

	function onBlur() {
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
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
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
				'peer block w-full appearance-none rounded-md border-[1.5px] border-input bg-card text-foreground transition-[color,box-shadow] outline-none',
				'placeholder:text-muted-foreground focus:border-ring focus:ring-[0.5px] focus:ring-ring',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/10',
				SIZES[size].input,
				leadPad,
				trailPad
			)}
		/>

		<label
			for={inputId}
			data-slot="combobox-label"
			class={cn(
				'pointer-events-none absolute z-10 origin-[0] scale-75 transform truncate pr-3 text-muted-foreground duration-200',
				'peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100',
				'peer-focus:scale-75 peer-focus:text-foreground',
				'peer-aria-[invalid=true]:text-destructive',
				SIZES[size].label,
				labelLeft
			)}
		>
			{label}
		</label>

		{#if chevron}
			<button
				type="button"
				tabindex={-1}
				{disabled}
				onclick={onButton}
				aria-label={search ? 'Clear' : 'Toggle options'}
				class="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
			>
				{#if search}<XIcon class="size-4" />{:else}<ChevronDownIcon class="size-4" />{/if}
			</button>
		{/if}
	</div>

	{#if open}
		<ul
			bind:this={listEl}
			id={listId}
			role="listbox"
			class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-overlay"
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
						'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-body-sm',
						i === highlighted && 'bg-muted'
					)}
				>
					{#if option.icon}
						<span class="grid size-7 flex-none place-items-center rounded-md bg-muted">●</span>
					{/if}
					<span class="truncate">
						{#each segments(option.label) as seg, si (si)}<span
								class={seg.match ? 'font-semibold' : ''}>{seg.text}</span
							>{/each}
					</span>
				</li>
			{:else}
				<li class="px-3 py-4 text-body-sm text-muted-foreground select-none">
					{m.combobox_no_results()}
				</li>
			{/each}
		</ul>
	{/if}

	{#if currentError}
		<p data-slot="combobox-error" class="mt-1 text-body-sm text-destructive">{currentError}</p>
	{/if}
</div>
