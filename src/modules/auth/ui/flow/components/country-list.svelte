<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { PHONE_COUNTRIES } from '$shared/ui/molecules/phone-field/countries';
	import { foldSearchText } from '$shared/lib/text';
	import { cn } from '$shared/lib/utils';

	let {
		value,
		options,
		onSelect
	}: {
		value: string;
		options: { locale: 'el' | 'en' };
		onSelect: (dialCode: string) => void;
	} = $props();

	let query = $state('');
	const shown = $derived(
		PHONE_COUNTRIES.filter((country) =>
			foldSearchText(`${country.name} ${country.value}`).includes(foldSearchText(query.trim()))
		)
	);
</script>

<!-- The list of the application's countries, with its search (`identifier-field`). -->
<label
	class="mx-4 mt-1 mb-2 flex min-h-touch flex-row items-center gap-2 rounded-full bg-foreground/6 px-4 text-muted-foreground"
>
	<Ionicon name="search" class="icon-sm" />
	<input
		bind:value={query}
		maxlength={40}
		placeholder={m.auth_prompt_country_search({}, options)}
		aria-label={m.auth_prompt_country_search({}, options)}
		data-testid="auth-country-search"
		class="min-h-touch flex-1 bg-transparent text-body-md text-foreground outline-none"
	/>
</label>
<div role="listbox" aria-label={m.auth_prompt_country_label({}, options)}>
	{#each shown as country (country.value)}
		{@const selected = country.value === value}
		<button
			type="button"
			role="option"
			aria-selected={selected}
			data-testid={`auth-country-${country.value}`}
			class="flex min-h-control-lg w-full flex-row items-center gap-4 px-6 py-2 text-start transition-colors duration-standard ease-standard outline-none focus-visible:bg-background can-hover:hover:bg-background"
			onclick={() => onSelect(country.value)}
		>
			<span aria-hidden="true" class="w-6 text-center text-body-md">{country.flag}</span>
			<span class="flex min-w-0 flex-1 flex-col">
				<span class={cn('text-body-lg font-medium', selected && 'text-primary-text')}
					>{country.value}</span
				>
				<span class="text-body-sm text-muted-foreground">{country.name}</span>
			</span>
			{#if selected}<Ionicon name="checkmark" class="icon-md text-primary" />{/if}
		</button>
	{/each}
</div>
