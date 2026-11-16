<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuTrigger
	} from '$shared/ui/primitives/dropdown-menu';
	import type { DoctorOfficeChoice } from '../types';

	let {
		offices,
		chosen,
		onChoose,
		locale
	}: {
		/** The doctor's offices (more than one: with one the filter does not show). */
		offices: DoctorOfficeChoice[];
		/** The office the lists are narrowed to, `null` for every office. */
		chosen: string | null;
		onChoose: (officeId: string | null) => void;
		locale: SupportedLocale;
	} = $props();

	// «Όλα τα ιατρεία» in the menu: a word no office id (a UUID) can be.
	const ALL = 'all';
	let open = $state(false);
	const allLabel = $derived(m.doctor_appointments_offices_all({}, { locale }));
	const choices = $derived([{ id: ALL, label: allLabel }, ...offices]);
	const label = $derived(offices.find((office) => office.id === chosen)?.label ?? allLabel);
	const value = $derived(chosen ?? ALL);

	function choose(next: string) {
		open = false;
		if (next !== value) onChoose(next === ALL ? null : next);
	}
</script>

<!-- 🔴 D-W51-29 (`64-switch/sw.js:329-330`, `sw.css:150-155`): «Όλα τα ιατρεία ▾», a pill of the row (36, 14 words), ringed
     dark once an office is chosen; it opens a small list of the offices by their street, the chosen one bold on the chip's
     grey with a tick. No colour under the pointer (U-100). -->
<DropdownMenu bind:open>
	<DropdownMenuTrigger
		data-testid="doctor-appointments-office"
		data-chosen={chosen ? 'office' : 'all'}
		class="shrink-0 self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<span
			class={cn(
				'inline-flex min-h-chip-tab flex-row items-center gap-1.5 rounded-full border bg-card px-4 text-body-sm font-medium text-foreground',
				chosen ? 'border-foreground ring-1 ring-foreground ring-inset' : 'border-border'
			)}
		>
			<span class="truncate">{label}</span>
			<Ionicon name="chevron-down" class="icon-sm shrink-0" />
		</span>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="start" data-testid="doctor-appointments-office-menu" class="p-1.5">
		<DropdownMenuRadioGroup {value} onValueChange={choose}>
			{#each choices as choice (choice.id)}
				{@const selected = choice.id === value}
				<!-- The kit's dot is hidden: the prototype's tick at the end says the choice. -->
				<DropdownMenuRadioItem
					value={choice.id}
					data-testid={`doctor-appointments-office-${choice.id}`}
					class="justify-between gap-3 rounded-md pr-3 pl-3 text-body-md hover:bg-transparent focus:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset data-[state=checked]:bg-chip data-[state=checked]:font-semibold [&>span:first-child]:hidden"
				>
					<span class="truncate">{choice.label}</span>
					{#if selected}
						<Ionicon name="checkmark" class="icon-md shrink-0" />
					{/if}
				</DropdownMenuRadioItem>
			{/each}
		</DropdownMenuRadioGroup>
	</DropdownMenuContent>
</DropdownMenu>
