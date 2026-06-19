<script lang="ts">
	import {
		Select,
		SelectTrigger,
		SelectValue,
		SelectContent,
		SelectItem
	} from '$shared/ui/primitives/select';
	import type { FieldApi } from '$shared/lib/form';

	let {
		label = 'Date of birth',
		value = $bindable(''),
		field,
		error,
		disabled = false,
		minYear = 1920,
		maxYear = new Date().getFullYear()
	}: {
		label?: string;
		/** ISO date string `YYYY-MM-DD`. */
		value?: string;
		field?: FieldApi<string>;
		error?: string;
		disabled?: boolean;
		minYear?: number;
		maxYear?: number;
	} = $props();

	const MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const current = $derived(field ? (field.value ?? '') : value);
	const [y0, m0, d0] = $derived(current ? current.split('-') : ['', '', '']);

	let day = $state('');
	let month = $state('');
	let year = $state('');

	// Hydrate selects from an incoming value.
	$effect(() => {
		day = d0 ? String(Number(d0)) : '';
		month = m0 ? String(Number(m0)) : '';
		year = y0 ?? '';
	});

	const currentError = $derived(field ? field.error : error);
	const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
	const years = $derived(
		Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(maxYear - i))
	);

	function commit() {
		if (!day || !month || !year) return;
		const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
		if (field) field.setValue(iso);
		else value = iso;
	}
</script>

<fieldset class="w-full" data-slot="date-of-birth-field" {disabled}>
	<legend class="mb-1.5 text-label-lg text-muted-foreground">{label}</legend>
	<div class="flex gap-2">
		<Select bind:value={day} onValueChange={commit} {disabled}>
			<SelectTrigger class="h-12 flex-1" aria-label="Day"
				><SelectValue placeholder="Day" /></SelectTrigger
			>
			<SelectContent>
				{#each days as d (d)}<SelectItem value={d}>{d}</SelectItem>{/each}
			</SelectContent>
		</Select>

		<Select bind:value={month} onValueChange={commit} {disabled}>
			<SelectTrigger class="h-12 flex-[1.4]" aria-label="Month"
				><SelectValue placeholder="Month" /></SelectTrigger
			>
			<SelectContent>
				{#each MONTHS as name, i (name)}<SelectItem value={String(i + 1)}>{name}</SelectItem>{/each}
			</SelectContent>
		</Select>

		<Select bind:value={year} onValueChange={commit} {disabled}>
			<SelectTrigger class="h-12 flex-1" aria-label="Year"
				><SelectValue placeholder="Year" /></SelectTrigger
			>
			<SelectContent>
				{#each years as y (y)}<SelectItem value={y}>{y}</SelectItem>{/each}
			</SelectContent>
		</Select>
	</div>

	{#if currentError}
		<p class="mt-1 text-body-sm text-destructive">{currentError}</p>
	{/if}
</fieldset>
