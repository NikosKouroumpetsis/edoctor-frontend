<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import { composeBirthDate } from '$modules/auth/lib/identity';

	let {
		value,
		options,
		onConfirm,
		onCancel
	}: {
		/** `YYYY-MM-DD`, empty for none. */
		value: string;
		options: { locale: 'el' | 'en' };
		onConfirm: (date: string) => void;
		onCancel: () => void;
	} = $props();

	// The picker's bounds: today and 120 years back (the backend's `DATE_OF_BIRTH_MAX_AGE_YEARS`); the server decides.
	const MAX_AGE_YEARS = 120;
	const DEFAULT_YEAR = 1990;
	const thisYear = new Date().getUTCFullYear();

	const initial = () => {
		const [year, month, day] = value.split('-').map(Number);
		return value ? { year, month, day } : { year: DEFAULT_YEAR, month: 1, day: 1 };
	};
	const start = initial();
	let day = $state(start.day);
	let month = $state(start.month);
	let year = $state(start.year);

	const monthNames = $derived(
		Array.from({ length: 12 }, (_, index) =>
			new Intl.DateTimeFormat(options.locale === 'en' ? 'en-GB' : 'el-GR', {
				month: 'long',
				timeZone: 'UTC'
			}).format(new Date(Date.UTC(2000, index, 15)))
		)
	);
	const selectClass =
		'min-h-touch w-full rounded-md border border-input bg-card px-3 text-body-lg text-foreground outline-none focus-visible:border-ring';
</script>

<div class="grid grid-cols-[1fr_1.5fr_1.1fr] gap-2 px-6 pt-2 pb-4">
	<select
		bind:value={day}
		aria-label={m.auth_register_birth_date_day({}, options)}
		data-testid="auth-date-day"
		class={selectClass}
	>
		{#each { length: 31 }, index (index)}
			<option value={index + 1}>{index + 1}</option>
		{/each}
	</select>
	<select
		bind:value={month}
		aria-label={m.auth_register_birth_date_month({}, options)}
		data-testid="auth-date-month"
		class={selectClass}
	>
		{#each monthNames as name, index (index)}
			<option value={index + 1}>{name}</option>
		{/each}
	</select>
	<select
		bind:value={year}
		aria-label={m.auth_register_birth_date_year({}, options)}
		data-testid="auth-date-year"
		class={selectClass}
	>
		{#each { length: MAX_AGE_YEARS + 1 }, index (index)}
			<option value={thisYear - index}>{thisYear - index}</option>
		{/each}
	</select>
</div>
<div class="flex flex-row gap-3 px-6">
	<Button
		tone="muted"
		label={m.auth_register_birth_date_cancel({}, options)}
		bordered={false}
		class="flex-1"
		textClass="text-body-lg"
		onclick={onCancel}
	/>
	<Button
		tone="contrast"
		label={m.auth_register_birth_date_confirm({}, options)}
		bordered={false}
		class="flex-1"
		textClass="text-body-lg"
		data-testid="auth-date-confirm"
		onclick={() => onConfirm(composeBirthDate(year, month, day))}
	/>
</div>
