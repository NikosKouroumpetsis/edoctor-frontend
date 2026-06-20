<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import {
		Select,
		SelectTrigger,
		SelectValue,
		SelectContent,
		SelectItem,
		SelectGroup,
		SelectLabel,
		SelectSeparator
	} from '$shared/ui/primitives/select';

	const { Story } = defineMeta({
		title: 'Primitives/Select',
		component: Select,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state('');
	let preselected = $state('derma');
	let grouped = $state('');
	let sizes = $state('');
</script>

<Story name="Default">
	{#snippet template()}
		<Select bind:value name="specialty">
			<SelectTrigger class="w-64" aria-label="Specialty">
				<SelectValue placeholder="Pick a specialty" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="cardio">Cardiology</SelectItem>
				<SelectItem value="derma">Dermatology</SelectItem>
				<SelectItem value="neuro">Neurology</SelectItem>
			</SelectContent>
		</Select>
	{/snippet}
</Story>

<Story name="Pre-selected">
	{#snippet template()}
		<Select bind:value={preselected} name="specialty-pre">
			<SelectTrigger class="w-64" aria-label="Specialty">
				<SelectValue placeholder="Pick a specialty" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="cardio">Cardiology</SelectItem>
				<SelectItem value="derma">Dermatology</SelectItem>
				<SelectItem value="neuro">Neurology</SelectItem>
			</SelectContent>
		</Select>
	{/snippet}
</Story>

<Story name="Grouped + separator">
	{#snippet template()}
		<Select bind:value={grouped} name="city">
			<SelectTrigger class="w-64" aria-label="City">
				<SelectValue placeholder="Pick a city" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Greece</SelectLabel>
					<SelectItem value="ath">Athens</SelectItem>
					<SelectItem value="skg">Thessaloniki</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectGroup>
					<SelectLabel>Cyprus</SelectLabel>
					<SelectItem value="nic">Nicosia</SelectItem>
				</SelectGroup>
			</SelectContent>
		</Select>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			{#each ['sm', 'default', 'lg', 'xl'] as const as s (s)}
				<Select bind:value={sizes} name={`size-${s}`}>
					<SelectTrigger size={s} class="w-64" aria-label={s}>
						<SelectValue placeholder={s} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="cardio">Cardiology</SelectItem>
						<SelectItem value="derma">Dermatology</SelectItem>
					</SelectContent>
				</Select>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Disabled">
	{#snippet template()}
		<Select value="" name="specialty-disabled" disabled>
			<SelectTrigger class="w-64" aria-label="Specialty">
				<SelectValue placeholder="Disabled" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="cardio">Cardiology</SelectItem>
			</SelectContent>
		</Select>
	{/snippet}
</Story>
