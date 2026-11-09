<script lang="ts">
	import MapPinIcon from '~icons/lucide/map-pin';
	import NavigationIcon from '~icons/lucide/navigation';
	import PencilIcon from '~icons/lucide/pencil';
	import { m } from '$paraglide/messages.js';
	import { resolveDeviceLocation } from '$shared/lib/location';
	import { SearchField } from '$shared/ui/molecules/search-field';
	import { Spinner } from '$shared/ui/primitives/spinner';
	import type { DoctorOnboardingAddressSuggestion } from '$modules/doctor-onboarding/api/address-search';
	import type { DoctorOnboardingDraftFields } from '$modules/doctor-onboarding/types';
	import { DOCTOR_ONBOARDING_ADDRESS_QUERY_MAX_LENGTH } from '$modules/doctor-onboarding/config';
	import {
		addressEditsOfDetails,
		addressEditsOfDevice,
		addressEditsOfManual
	} from '$modules/doctor-onboarding/lib/payload';
	import AddressRow from '../components/address-row.svelte';
	import SubFrame from '../components/sub-frame.svelte';
	import { useDoctorAddressSearch } from '../hooks/use-address-search.svelte';
	import { useDoctorOnboardingStep } from '../hooks/use-step.svelte';
	import type { DoctorOnboardingContext } from '../types';

	let props: DoctorOnboardingContext = $props();

	const controller = useDoctorOnboardingStep(() => props, 'address-search');
	const draft = controller.draft;
	const options = $derived({ locale: props.locale });
	const search = useDoctorAddressSearch(
		() => controller.signedIn,
		() => controller.session?.expire({})
	);
	let notice = $state<string | null>(null);
	let locating = $state(false);

	/** The address chosen, typed or located: «Επιβεβαιώστε τη διεύθυνση» takes this screen's place in the history. */
	function confirm(edits: Partial<DoctorOnboardingDraftFields['office']>) {
		draft.update('office', edits);
		controller.replace('address-confirm');
	}

	async function choose(suggestion: DoctorOnboardingAddressSuggestion) {
		if (search.picking) return;
		notice = null;
		const answer = await search.pick(suggestion);
		if ('details' in answer) {
			confirm(addressEditsOfDetails(answer.details));
			return;
		}
		// The sign-in opens over the page (NIT-2): nothing to say here.
		if (answer.failure === 'session') return;
		notice =
			answer.failure === 'outside-greece'
				? m.doctor_onboarding_address_no_results({}, options)
				: m.doctor_onboarding_address_search_error({}, options);
	}

	/** D-W3-12: the browser's point for the pin alone; the street and the town are typed on the next screen. */
	async function locate() {
		if (locating) return;
		notice = null;
		locating = true;
		const result = await resolveDeviceLocation({ highAccuracy: true });
		locating = false;
		if (result.status === 'granted') {
			confirm(addressEditsOfDevice(result.coords));
			return;
		}
		notice =
			result.status === 'denied'
				? m.criteria_location_denied({}, options)
				: m.criteria_location_unavailable({}, options);
	}
</script>

{#snippet locateIcon()}<NavigationIcon class="icon-lg" />{/snippet}
{#snippet pinIcon()}<MapPinIcon class="icon-lg" />{/snippet}
{#snippet pencilIcon()}<PencilIcon class="icon-lg" />{/snippet}

<!-- 37 · «Εισαγάγετε τη διεύθυνση του ιατρείου» (record §6.7.2, U-109.2): a page of its own (U-102). The field (at most
     120); below two letters «Χρήση τρέχουσας τοποθεσίας» (the browser's point only, D-W3-12); from two letters, 300 ms
     after the last key, «Προτεινόμενα» with up to five of Google's places — their words are data, shown as text —, «Μη
     αυτόματη εισαγωγή διεύθυνσης» and «Google Maps» under them (no map on this screen, record §6.6); none or a failure
     says so and keeps the manual row. No colour under the pointer (U-100). -->
<SubFrame
	context={props}
	title={m.doctor_onboarding_address_title({}, options)}
	backHref={controller.hrefOf('location')}
	onBack={controller.goBack}
	testId="doctor-onboarding-address-search"
>
	<div role="search" class="mb-2">
		<SearchField
			bind:value={search.query}
			shape="pill"
			placeholder={m.doctor_onboarding_address_search_placeholder({}, options)}
			aria-label={m.doctor_onboarding_address_search_label({}, options)}
			maxlength={DOCTOR_ONBOARDING_ADDRESS_QUERY_MAX_LENGTH}
			autocomplete="off"
			spellcheck={false}
			inputClass="min-h-control-lg"
			onClear={() => (search.query = '')}
			testId="doctor-onboarding-address-field"
		/>
	</div>

	<div class="flex flex-col" aria-busy={search.view.kind === 'waiting' || search.picking}>
		{#if search.view.kind === 'idle'}
			<AddressRow
				title={m.doctor_onboarding_address_current_location({}, options)}
				icon={locateIcon}
				busy={locating}
				onclick={() => void locate()}
				testId="doctor-onboarding-address-here"
			/>
		{:else if search.view.kind === 'waiting'}
			<div class="flex justify-center py-6"><Spinner tone="muted" /></div>
		{:else}
			{#if search.view.kind === 'suggestions'}
				<p class="mt-4 mb-1 text-body-sm font-semibold text-muted-foreground">
					{m.doctor_onboarding_address_suggestions({}, options)}
				</p>
				<ul class="flex flex-col" data-testid="doctor-onboarding-address-suggestions">
					{#each search.view.suggestions as suggestion (suggestion.placeId)}
						<li>
							<AddressRow
								title={suggestion.mainText}
								line={suggestion.secondaryText}
								icon={pinIcon}
								busy={false}
								onclick={() => void choose(suggestion)}
								testId={`doctor-onboarding-address-${suggestion.placeId}`}
							/>
						</li>
					{/each}
				</ul>
			{:else}
				<p
					class="py-4 text-body-sm text-muted-foreground"
					role="status"
					data-testid="doctor-onboarding-address-empty"
				>
					{search.view.kind === 'none'
						? m.doctor_onboarding_address_no_results({}, options)
						: m.doctor_onboarding_address_search_error({}, options)}
				</p>
			{/if}
			<AddressRow
				title={m.doctor_onboarding_address_manual({}, options)}
				icon={pencilIcon}
				busy={false}
				onclick={() => confirm(addressEditsOfManual())}
				testId="doctor-onboarding-address-manual"
			/>
			{#if search.view.kind === 'suggestions'}
				<!-- Review w3-w4 R1 NIT-3: a paragraph takes no name (ARIA 1.2); a reader hears the whole line instead. -->
				<p
					class="mt-2 text-right text-label-md text-muted-foreground"
					data-testid="doctor-onboarding-address-attribution"
				>
					<span class="sr-only">{m.doctor_onboarding_address_attribution_label({}, options)}</span>
					<span aria-hidden="true">{m.doctor_onboarding_address_attribution({}, options)}</span>
				</p>
			{/if}
		{/if}
		{#if notice}
			<p
				role="alert"
				class="mt-2 text-label-lg font-medium text-danger-text"
				data-testid="doctor-onboarding-address-notice"
			>
				{notice}
			</p>
		{/if}
	</div>
</SubFrame>
