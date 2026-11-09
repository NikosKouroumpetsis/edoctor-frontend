<script lang="ts">
	import CalendarCheckIcon from '~icons/lucide/calendar-check';
	import CalendarOffIcon from '~icons/lucide/calendar-off';
	import type { Snippet } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { BrandGoogleCalendar } from '$shared/ui/icons/brand-google-calendar';
	import { BrandMicrosoftOutlook } from '$shared/ui/icons/brand-microsoft-outlook';
	import { SelectableCards } from '$shared/ui/molecules/selectable-cards';
	import { DOCTOR_ONBOARDING_CALENDAR_OPTIONS } from '$modules/doctor-onboarding/config';
	import { readDoctorCalendarCategory } from '$modules/doctor-onboarding/lib/values';
	import type { DoctorOnboardingCalendarCategory } from '$modules/doctor-onboarding/types';
	import Frame from '../components/frame.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'calendar');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const category = $derived(readDoctorCalendarCategory(draft.edits, controller.progress));
	const groupHeading = $props.id();

	const CALENDARS: Record<
		DoctorOnboardingCalendarCategory,
		{ title: () => string; description: () => string; icon: Snippet }
	> = {
		GOOGLE: {
			title: () => m.doctor_onboarding_calendar_google({}, options),
			description: () => m.doctor_onboarding_calendar_google_hint({}, options),
			icon: googleIcon
		},
		MICROSOFT: {
			title: () => m.doctor_onboarding_calendar_microsoft({}, options),
			description: () => m.doctor_onboarding_calendar_microsoft_hint({}, options),
			icon: outlookIcon
		},
		DIRECT: {
			title: () => m.doctor_onboarding_calendar_direct({}, options),
			description: () => m.doctor_onboarding_calendar_direct_hint({}, options),
			icon: directIcon
		},
		NONE: {
			title: () => m.doctor_onboarding_calendar_none({}, options),
			description: () => m.doctor_onboarding_calendar_none_hint({}, options),
			icon: noneIcon
		}
	};

	/** «Επόμενο» (record §6.4): `calendar`, the one chosen; then its edit goes. */
	async function commit(): Promise<boolean> {
		if (!category) return false;
		const answer = await controller.save([{ kind: 'calendar', category }]);
		if (answer) draft.clear('calendar');
		return Boolean(answer);
	}

	async function next() {
		if (await commit()) controller.goNext();
	}
</script>

{#snippet googleIcon()}<BrandGoogleCalendar />{/snippet}
{#snippet outlookIcon()}<BrandMicrosoftOutlook class="text-foreground" />{/snippet}
{#snippet directIcon()}<CalendarCheckIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}
{#snippet noneIcon()}<CalendarOffIcon aria-hidden="true" class="icon-xl shrink-0" />{/snippet}

<!-- 40 · «Ποιο ημερολόγιο χρησιμοποιείτε περισσότερο;» (record §6.4, §6.8): four cards one under the other — Google
     Calendar with Google's own coloured mark (U-111.1), Microsoft Outlook in one colour, eDoctor's own, none for now; no
     Apple. One required. No colour under the pointer (U-100). -->
<Frame
	{controller}
	context={props}
	title={m.doctor_onboarding_calendar_title({}, options)}
	subtitle={m.doctor_onboarding_calendar_subtitle({}, options)}
	next={{ disabled: !category, onClick: () => void next() }}
	commit={category ? commit : undefined}
	testId="doctor-onboarding-calendar"
>
	<h2 id={groupHeading} class="sr-only">{m.doctor_onboarding_calendar_group_label({}, options)}</h2>
	<SelectableCards
		labelledBy={groupHeading}
		hover={false}
		value={category ?? undefined}
		onChange={(next) =>
			draft.update('calendar', { category: next as DoctorOnboardingCalendarCategory })}
		options={DOCTOR_ONBOARDING_CALENDAR_OPTIONS.map((value) => ({
			value,
			title: CALENDARS[value].title(),
			description: CALENDARS[value].description(),
			icon: CALENDARS[value].icon
		}))}
		testId="doctor-onboarding-calendar-option"
	/>
</Frame>
