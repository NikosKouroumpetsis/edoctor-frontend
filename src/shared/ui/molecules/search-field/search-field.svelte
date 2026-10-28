<script lang="ts" module>
	import type { HTMLInputAttributes } from 'svelte/elements';

	/**
	 * The application's search fields (D2, K4.3): `launcher` a button drawn as a field (the criteria accordion),
	 * `active` the panel's field with «‹» and a clear, dark 2px border (the open search panel), `inset` the bordered
	 * input with the glyph inside (the former `SearchInput`, the sheets).
	 */
	export type SearchFieldVariant = 'launcher' | 'active' | 'inset';
	export type SearchFieldReturnKey = 'search' | 'done' | 'go' | 'next';

	/**
	 * Web only (keyboard): the field drives a list of options whose focus stays in the field (the combobox of the
	 * `command` primitive). The arrows move `activeId` through `optionIds` (`aria-activedescendant`), Enter commits it.
	 */
	export type SearchFieldListboxProps =
		| {
				listboxId: string;
				optionIds: readonly string[];
				activeId?: string;
				onCommit: (id: string) => void;
		  }
		| { listboxId?: undefined; optionIds?: undefined; activeId?: undefined; onCommit?: undefined };

	type SearchFieldInputAttributes = Omit<
		HTMLInputAttributes,
		'value' | 'placeholder' | 'type' | 'size' | 'children' | 'class' | 'onclick' | 'files'
	>;
	type SearchFieldBase = {
		/** The words in the field; `launcher` shows them, or the placeholder in muted when empty. */
		value?: string;
		placeholder: string;
		/** The name read aloud (the application's `accessibilityLabel`). */
		'aria-label': string;
		disabled?: boolean;
		testId?: string;
		ref?: HTMLInputElement | null;
		class?: string;
	};

	/** `launcher`: a button drawn as a field — no typing, no clear, no «‹» (the application's union, K4.3). */
	export type SearchFieldLauncherProps = SearchFieldBase & {
		variant: 'launcher';
		/** The press (the application's `onPress`). */
		onclick: (event: MouseEvent) => void;
		onChangeText?: never;
		onClear?: never;
		clearLabel?: never;
		clearTestId?: never;
		onBack?: never;
		backLabel?: never;
		backTestId?: never;
		returnKeyType?: never;
		inputClass?: never;
		oninput?: never;
		onkeydown?: never;
		listboxId?: never;
		optionIds?: never;
		activeId?: never;
		onCommit?: never;
	};
	/** `active`: the panel's field — «‹» and the clear are part of it, each with its name. */
	export type SearchFieldActiveProps = SearchFieldInputAttributes &
		SearchFieldBase & {
			variant: 'active';
			onChangeText?: (value: string) => void;
			onBack: () => void;
			backLabel: string;
			backTestId?: string;
			onClear: () => void;
			clearLabel: string;
			clearTestId?: string;
			returnKeyType?: SearchFieldReturnKey;
			inputClass?: never;
			onclick?: never;
		} & SearchFieldListboxProps;
	/** `inset` (default): the bordered input; its clear is named by the caller or by `common_clear_search`. */
	export type SearchFieldInsetProps = SearchFieldInputAttributes &
		SearchFieldBase & {
			variant?: 'inset';
			onChangeText?: (value: string) => void;
			onClear?: () => void;
			clearLabel?: string;
			clearTestId?: string;
			onBack?: never;
			backLabel?: never;
			backTestId?: never;
			returnKeyType?: SearchFieldReturnKey;
			/** Extra classes of the input (the application's `inputClassName`). */
			inputClass?: string;
			onclick?: never;
		} & SearchFieldListboxProps;

	export type SearchFieldProps =
		| SearchFieldLauncherProps
		| SearchFieldActiveProps
		| SearchFieldInsetProps;
</script>

<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { handleListboxKeydown } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Input } from '$shared/ui/primitives/input';

	let {
		variant = 'inset',
		value = $bindable(''),
		placeholder,
		'aria-label': ariaLabel,
		onChangeText,
		onclick,
		onClear,
		clearLabel,
		clearTestId,
		onBack,
		backLabel,
		backTestId,
		listboxId,
		optionIds,
		activeId = $bindable(),
		onCommit,
		returnKeyType = 'search',
		testId,
		inputClass,
		disabled = false,
		ref = $bindable(null),
		class: className,
		oninput,
		onkeydown,
		...restProps
	}: SearchFieldProps = $props();

	const showClear = $derived(Boolean(onClear) && Boolean(value) && !disabled);

	function handleInput(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		value = event.currentTarget.value;
		activeId = undefined;
		onChangeText?.(value);
		oninput?.(event);
	}

	function handleKeydown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onkeydown?.(event);
		if (!listboxId || event.defaultPrevented) return;
		activeId = handleListboxKeydown(event, optionIds ?? [], activeId, (id) => onCommit?.(id));
	}

	// The clear takes the words away and gives the focus back to the field (its button is gone with the words).
	function clear() {
		value = '';
		activeId = undefined;
		onChangeText?.('');
		onClear?.();
		ref?.focus();
	}

	// The option the keyboard reached stays in view inside its scrolling list.
	$effect(() => {
		if (!listboxId || !activeId || typeof document === 'undefined') return;
		document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
	});

	const comboboxProps = $derived(
		listboxId
			? {
					role: 'combobox',
					'aria-controls': listboxId,
					'aria-expanded': (optionIds?.length ?? 0) > 0,
					'aria-autocomplete': 'list' as const,
					'aria-activedescendant': activeId
				}
			: {}
	);
	// WebKit draws its own clear on a search input; the field's clear is its own button.
	const noNativeClear = '[&::-webkit-search-cancel-button]:appearance-none';
</script>

{#if variant === 'launcher'}
	<div
		data-slot="search-field"
		data-variant="launcher"
		class={cn(
			'flex min-h-row flex-row items-center gap-2 rounded-md border border-muted-foreground/50 bg-card px-3',
			className
		)}
	>
		<Ionicon name="search-outline" class="icon-md text-muted-foreground" />
		<button
			type="button"
			data-slot="search-field-launcher"
			data-testid={testId}
			aria-label={ariaLabel}
			{disabled}
			{onclick}
			class="flex min-h-touch min-w-touch flex-1 flex-col justify-center rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<span
				class={cn('line-clamp-1 text-body-md', value ? 'text-foreground' : 'text-muted-foreground')}
				>{value || placeholder}</span
			>
		</button>
	</div>
{:else if variant === 'active'}
	<div
		data-slot="search-field"
		data-variant="active"
		class={cn(
			'flex min-h-control-lg flex-row items-center gap-touch-gap rounded-md border-2 border-foreground bg-card px-1',
			className
		)}
	>
		{#if onBack}
			<IconButton
				icon="chevron-back"
				aria-label={backLabel ?? ''}
				data-testid={backTestId}
				onclick={onBack}
			/>
		{/if}
		<input
			bind:this={ref}
			{value}
			type="search"
			data-slot="search-field-input"
			data-testid={testId}
			aria-label={ariaLabel}
			{placeholder}
			{disabled}
			autocomplete="off"
			autocapitalize="none"
			spellcheck="false"
			enterkeyhint={returnKeyType}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class={cn(
				'min-h-touch min-w-touch flex-1 bg-transparent text-body-lg text-foreground outline-none placeholder:text-muted-foreground',
				noNativeClear
			)}
			{...comboboxProps}
			{...restProps}
		/>
		{#if showClear}
			<IconButton
				icon="close"
				appearance="tint"
				size="xs"
				surface="muted"
				iconSize="md"
				aria-label={clearLabel ?? ''}
				data-testid={clearTestId}
				onclick={clear}
			/>
		{/if}
	</div>
{:else}
	<div
		data-slot="search-field"
		data-variant="inset"
		class={cn('relative flex w-full flex-col justify-center', className)}
	>
		<span class="pointer-events-none absolute left-3 z-10 flex" aria-hidden="true">
			<Ionicon name="search" class="icon-md text-muted-foreground" />
		</span>
		<Input
			bind:ref
			{value}
			type="search"
			data-testid={testId}
			aria-label={ariaLabel}
			{placeholder}
			{disabled}
			enterkeyhint={returnKeyType}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class={cn('px-3.5 pl-field-inset', showClear && 'pr-touch', noNativeClear, inputClass)}
			{...comboboxProps}
			{...restProps}
		/>
		{#if showClear}
			<IconButton
				icon="close-circle"
				iconSize="md"
				iconTone="muted"
				aria-label={clearLabel ?? m.common_clear_search()}
				data-testid={clearTestId}
				onclick={clear}
				class="absolute right-0 z-10"
			/>
		{/if}
	</div>
{/if}
