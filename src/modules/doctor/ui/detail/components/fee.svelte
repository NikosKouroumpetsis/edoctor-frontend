<script lang="ts" module>
	/**
	 * Where the fee sits (the application's `DoctorFeePrice`): `bar` the phone's booking bar, `offer` a service's price
	 * box (right-aligned); web `card` the booking card from 744 (Airbnb's 22 price line).
	 */
	export type FeePlacement = 'bar' | 'card' | 'offer';

	const signInClasses: Record<FeePlacement, string> = {
		bar: 'text-body-md',
		card: 'text-body-lg',
		offer: 'justify-end text-right text-body-sm'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { PriceLabel } from '$shared/ui/primitives/price-label';
	import type { DoctorDetailFee } from '$modules/doctor/lib/detail';

	let {
		fee,
		placement,
		onSignIn,
		testId
	}: {
		fee: DoctorDetailFee;
		placement: FeePlacement;
		/** U-34.4 / S-31.4: the guest's «🔒 Συνδεθείτε για κόστος» opens the sign-in. */
		onSignIn: () => void;
		testId?: string;
	} = $props();
</script>

<!-- 🔴 U-34.4 / U-27.4 (app = web): a member reads the amount (the kit's `PriceLabel`); a guest the lock and
     «Συνδεθείτε για κόστος» — the text colour, 600, underlined, its own 48 button that opens the sign-in and comes back
     to this page. -->
{#if fee.kind === 'login'}
	<button
		type="button"
		aria-label={fee.label}
		data-slot="doctor-fee-sign-in"
		data-testid={testId}
		onclick={() => onSignIn()}
		class={cn(
			'group -my-3 inline-flex min-h-touch min-w-touch items-center gap-1 rounded-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			placement === 'offer' ? 'self-end' : 'self-start',
			signInClasses[placement]
		)}
	>
		<Ionicon name="lock-closed-outline" class="icon-sm shrink-0" />
		<span
			data-testid={testId ? `${testId}-label` : undefined}
			class="font-semibold underline can-hover:group-hover:decoration-2">{fee.label}</span
		>
	</button>
{:else if placement === 'card'}
	<p data-slot="doctor-fee" data-testid={testId} class="text-heading-sm text-foreground">
		{fee.label}
	</p>
{:else}
	<PriceLabel
		kind={fee.kind === 'amount' ? 'amount' : 'note'}
		label={fee.label}
		{placement}
		data-slot="doctor-fee"
		data-testid={testId}
	/>
{/if}
