<script lang="ts">
	import type { DoctorOnboardingPageProps } from '../types';
	import Access from './access.svelte';
	import AddressConfirm from './address-confirm.svelte';
	import AddressSearch from './address-search.svelte';
	import Amenities from './amenities.svelte';
	import Basic from './basic.svelte';
	import Calendar from './calendar.svelte';
	import Done from './done.svelte';
	import EmailCode from './email-code.svelte';
	import Email from './email.svelte';
	import Intro from './intro.svelte';
	import Location from './location.svelte';
	import Office from './office.svelte';
	import Overview from './overview.svelte';
	import Payments from './payments.svelte';
	import Pin from './pin.svelte';
	import Price from './price.svelte';
	import SpecialtyList from './specialty-list.svelte';
	import Specialty from './specialty.svelte';
	import Terms from './terms.svelte';

	let { screen, ...context }: DoctorOnboardingPageProps = $props();
</script>

<!-- Wave 3 · the doctor's sign-up (D-W3-28): the page the route names — each one starts its own state (`#key`), as a
     route of its own would; what the doctor wrote lives in the root's draft (U-112.2), never here. -->
{#key screen}
	{#if screen === 'overview'}
		<Overview {...context} />
	{:else if screen === 'stage-1'}
		<Intro {...context} stage={0} />
	{:else if screen === 'stage-2'}
		<Intro {...context} stage={1} />
	{:else if screen === 'stage-3'}
		<Intro {...context} stage={2} />
	{:else if screen === 'basic'}
		<Basic {...context} />
	{:else if screen === 'email'}
		<Email {...context} />
	{:else if screen === 'email-code'}
		<EmailCode {...context} />
	{:else if screen === 'specialty'}
		<Specialty {...context} />
	{:else if screen === 'specialty-list'}
		<SpecialtyList {...context} />
	{:else if screen === 'location'}
		<Location {...context} />
	{:else if screen === 'address-search'}
		<AddressSearch {...context} />
	{:else if screen === 'address-confirm'}
		<AddressConfirm {...context} />
	{:else if screen === 'pin'}
		<Pin {...context} />
	{:else if screen === 'office'}
		<Office {...context} />
	{:else if screen === 'amenities'}
		<Amenities {...context} />
	{:else if screen === 'payments'}
		<Payments {...context} />
	{:else if screen === 'price'}
		<Price {...context} />
	{:else if screen === 'calendar'}
		<Calendar {...context} />
	{:else if screen === 'terms'}
		<Terms {...context} />
	{:else if screen === 'access'}
		<Access {...context} />
	{:else}
		<Done {...context} />
	{/if}
{/key}
