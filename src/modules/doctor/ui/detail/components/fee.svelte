<script lang="ts" module>
	/**
	 * Where the fee sits (the application's `DoctorFeePrice`): `bar` the phone's booking bar, `offer` a service's price
	 * box (right-aligned); web `card` the booking card from 744 (Airbnb's 22 price line); U-70 Π5 `row` the end of a row
	 * of services (16/600, right-aligned) and `meta` its line under the title (14).
	 */
	export type FeePlacement = 'bar' | 'card' | 'offer' | 'row' | 'meta';

	const signInClasses: Record<FeePlacement, string> = {
		bar: 'text-body-md',
		card: 'text-body-lg',
		offer: 'justify-end text-right text-body-sm',
		row: 'justify-end text-right text-body-sm',
		meta: 'text-body-sm'
	};
	/** U-70 Π5: the two places in a row, which the kit's `PriceLabel` does not have. */
	const rowAmountClasses: Record<'row' | 'meta', string> = {
		row: 'text-body-lg font-semibold',
		meta: 'text-body-sm'
	};
</script>

<script lang="ts">
	import type { SignInRequest } from '$shared/state/session';
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
		onSignIn: (request?: SignInRequest) => void;
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
		onclick={() => onSignIn({ action: 'fee' })}
		class={cn(
			'group -my-3 inline-flex min-h-touch min-w-touch items-center gap-1 rounded-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			placement === 'offer' || placement === 'row' ? 'self-end' : 'self-start',
			signInClasses[placement]
		)}
	>
		<Ionicon name="lock-closed-outline" class="icon-sm shrink-0" />
		<span
			data-testid={testId ? `${testId}-label` : undefined}
			class="font-semibold underline can-hover:group-hover:decoration-2">{fee.label}</span
		>
	</button>
{:else if placement === 'row' || placement === 'meta'}
	<span
		data-slot="doctor-fee"
		data-testid={testId}
		class={cn('text-foreground tabular-nums', rowAmountClasses[placement])}>{fee.label}</span
	>
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
