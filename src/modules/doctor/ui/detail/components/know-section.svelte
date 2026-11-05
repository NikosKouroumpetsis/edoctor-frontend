<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type {
		DoctorAvailabilityOfficeTab,
		DoctorKnowContent,
		DoctorKnowPageId
	} from '$modules/doctor/lib/detail';
	import { doctorKnowBlockGlyphs } from './icons';
	import OfficeTabs from './office-tabs.svelte';
	import ProfileSection from './profile-section.svelte';

	let {
		content,
		tabs,
		activeOfficeId,
		locale,
		pageHref,
		onOpenPage,
		onSelectOffice
	}: {
		content: DoctorKnowContent;
		tabs: DoctorAvailabilityOfficeTab[];
		activeOfficeId: string | undefined;
		locale: SupportedLocale;
		/** `details/know?focus=…`: a block's page. */
		pageHref: (id: DoctorKnowPageId) => ResolvedPathname;
		onOpenPage: (id: DoctorKnowPageId, event: MouseEvent) => void;
		onSelectOffice: (officeId: string) => void;
	} = $props();

	const options = $derived({ locale });
</script>

<!-- 🔴 U-75, U-76 (screen 24, the profile's last section): one block per page. Below 744 the application's rows, the whole
     row pressed; from 744 Airbnb's blocks with «Εμφάνιση περισσότερων ›», three columns from 950. The office's pills only
     when the rules differ (Ε4): the same active office as the page (U-39.2). No word of a charge, anywhere (U-75.2). -->
<ProfileSection id="know" title={content.title}>
	{#if content.officeLine && activeOfficeId}
		<OfficeTabs
			{tabs}
			value={activeOfficeId}
			onChange={onSelectOffice}
			label={m.doctor_offices_label({}, options)}
			tabTestIdPrefix="doctor-know-tab"
			testId="doctor-know-tabs"
		/>
		<p data-testid="doctor-know-office" class="mt-2 text-body-sm text-muted-foreground">
			{#each content.officeLine as run, index (index)}{#if run.emphasis}<span
						class="font-semibold text-foreground">{run.text}</span
					>{:else}{run.text}{/if}{/each}
		</p>
	{/if}
	<div
		data-testid="doctor-know-blocks"
		class="mt-2 flex flex-col gap-1 rounded-md tablet:mt-4 tablet:gap-section split:grid split:grid-cols-3 split:gap-x-section-lg"
	>
		{#each content.blocks as block (block.id)}
			<div data-testid={`doctor-know-block-${block.id}`}>
				<a
					href={pageHref(block.id)}
					onclick={(event) => onOpenPage(block.id, event)}
					aria-haspopup="dialog"
					data-testid={`doctor-know-row-${block.id}`}
					class="group flex min-h-row-lg w-full flex-row items-start gap-4 rounded-md py-3.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:hidden"
				>
					<Ionicon
						name={doctorKnowBlockGlyphs[block.id]}
						class="icon-lg shrink-0 text-foreground"
					/>
					<span class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="text-body-lg font-semibold text-foreground">{block.title}</span>
						{#each block.lines as line (line)}
							<span class="text-body-md wrap-anywhere text-muted-foreground">{line}</span>
						{/each}
					</span>
					<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
				</a>
				<div class="hidden flex-col items-start gap-2 tablet:flex">
					<Ionicon
						name={doctorKnowBlockGlyphs[block.id]}
						class="mb-2 icon-lg shrink-0 text-foreground"
					/>
					<h3 class="text-body-lg font-semibold text-foreground">{block.title}</h3>
					{#each block.lines as line (line)}
						<p class="text-body-lg wrap-anywhere text-foreground/88">{line}</p>
					{/each}
					<a
						href={pageHref(block.id)}
						onclick={(event) => onOpenPage(block.id, event)}
						aria-haspopup="dialog"
						aria-label={m.doctor_know_show_more_label({ title: block.title }, options)}
						data-testid={`doctor-know-more-${block.id}`}
						class="group -my-2 inline-flex min-h-touch min-w-touch items-center gap-0.5 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<span
							class="text-body-lg font-semibold text-foreground underline underline-offset-3 can-hover:group-hover:decoration-2"
							>{m.doctor_expand({}, options)}</span
						>
						<Ionicon
							name="chevron-forward"
							class="icon-sm shrink-0 text-foreground transition-transform duration-standard ease-standard can-hover:group-hover:translate-x-0.5"
						/>
					</a>
				</div>
			</div>
		{/each}
	</div>
</ProfileSection>
