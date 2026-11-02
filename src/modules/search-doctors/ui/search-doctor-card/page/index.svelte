<script lang="ts">
	import type { DoctorCard, SearchResultCard } from '$modules/search-doctors/types';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaCard } from '$shared/ui/organisms/media-card';
	import { FavoriteButton } from '$shared/ui/primitives/favorite-button';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import FeeSignIn from '../components/fee-sign-in.svelte';
	import { searchDoctorCardMedia } from '../lib/media';
	import type { SearchDoctorCardVariant } from '../types';

	let {
		doctor,
		variant = 'rail',
		href,
		profileLabel,
		favoriteLabel,
		onFavorite,
		onSignIn,
		onHover,
		loading,
		testId = 'home-doctor-card'
	}: {
		/** The card's facts; the list variant also draws the results' (description, address, reviews). */
		doctor: DoctorCard &
			Partial<Pick<SearchResultCard, 'description' | 'address' | 'reviewCountLabel'>>;
		variant?: SearchDoctorCardVariant;
		/** The profile, already localized and resolved. */
		href: string;
		/** «Προφίλ γιατρού»: the link's name is this and the doctor's name. */
		profileLabel: string;
		/** «Αποθήκευσε γιατρό»: the heart's name is this and the doctor's name. */
		favoriteLabel: string;
		/** The heart: a guest goes to sign in (U-20). */
		onFavorite: () => void;
		/** «Συνδεθείτε για κόστος» while the fee is hidden: the sign-in (S-31.4, U-27.4), never the profile. */
		onSignIn: () => void;
		/** The pointer came onto the card (`true`) or left it: the results map grows its pin (§7.1). */
		onHover?: (hovering: boolean) => void;
		/** `eager` for the first row of a page. */
		loading?: 'lazy' | 'eager';
		/** `<testId>`, `<testId>-favorite`, `<testId>-name` … (the home's `home-doctor-card`, the results' own). */
		testId?: string;
	} = $props();

	const isList = $derived(variant === 'list');
	const signInForFee = $derived(doctor.fee.kind === 'login');
	const facts = $derived([doctor.specialty, doctor.area].filter(Boolean).join(' · '));
	// Airbnb's lines: each wraps to two at most rather than a «…» (U-20).
	const line = 'line-clamp-2 text-label-lg leading-tight';
	// The results' lines (the prototype's `.rgrid .card p`): 14, one line each but the description's two.
	const listLine = 'line-clamp-1 text-body-sm';
	// U-27.4 (f1b): a line with the fee's action keeps 4 of room around it for the action's grown target and focus ring
	// (its clamp clips what lies outside it), given back by its margin: nothing moves.
	const actionRoom = '-m-1 p-1';
</script>

<!-- U-20, the home's doctor card (Airbnb's on the application's facts): ONE link over the whole card to the profile,
     the heart its own button over the photo (white, with a shadow), «Επιλογή ασθενών» at the top left, the 1:1
     photo with the 16 corner lighting up as it arrives (0.8 s), then four lines. The ★ wears the `rating` colour
     (the application's, both themes) and never parts from its value (a no-break space).
     U-24.1, the results' list variant: the same card with Airbnb's 4:3 photo and the application's facts — the name,
     the specialty, the description (two muted lines), the full address (+ «· 0,6 χλμ» on «Κοντά μου»), the blue
     availability, the price, then «★ 4,9» (★ accent, the number blue) and «💬 184» — «★ Νέο» without reviews.
     U-27.3: the specialty (and the home's «Ειδικότητα · Περιοχή») in the text colour. U-27.4: a hidden fee is its own
     button (`FeeSignIn`, after the heart in the Tab order: the link, the heart over the photo, then the lines'). -->
<MediaCard
	{href}
	linkLabel={`${profileLabel} ${doctor.name}`}
	imageUrl={doctor.imageUrl}
	aspect={searchDoctorCardMedia[variant].aspect}
	imageClass="rounded-lg"
	reveal
	{loading}
	data-testid={testId}
	data-variant={variant}
	class={isList ? 'w-full gap-3' : 'w-full gap-2.5'}
	onpointerenter={onHover ? () => onHover(true) : undefined}
	onpointerleave={onHover ? () => onHover(false) : undefined}
>
	{#snippet badge()}
		{#if doctor.badgeLabel}
			<MediaBadge label={doctor.badgeLabel} maxLines={2} width="badge" besideAction />
		{/if}
	{/snippet}
	{#snippet action()}
		<FavoriteButton
			selected={false}
			onToggle={onFavorite}
			aria-label={`${favoriteLabel} ${doctor.name}`}
			appearance="overlay"
			size="md"
			inset="sm"
			data-testid={`${testId}-favorite`}
		/>
	{/snippet}
	{#if isList}
		<span class="flex flex-col gap-0.5">
			<span
				data-slot={`${testId}-name`}
				class="line-clamp-1 text-body-md font-semibold text-foreground"
			>
				{doctor.name}
			</span>
			{#if doctor.specialty}
				<!-- U-27.3 (app = web): the specialty in the text colour; the description stays muted. -->
				<span class={[listLine, 'text-foreground']}>{doctor.specialty}</span>
			{/if}
			{#if doctor.description}
				<span
					data-slot={`${testId}-description`}
					class="mt-1 line-clamp-2 text-body-sm text-muted-foreground"
				>
					{doctor.description}
				</span>
			{/if}
			{#if doctor.address}
				<span data-slot={`${testId}-address`} class={[listLine, 'text-foreground']}>
					{doctor.address}
				</span>
			{/if}
			{#if doctor.availabilityLabel}
				<span
					data-slot={`${testId}-availability`}
					class={[listLine, 'font-semibold text-primary-text']}
				>
					{doctor.availabilityLabel}
				</span>
			{/if}
			<!-- U-27.4: the hidden fee is the line's action, inline (the line's 14 and height, as before). -->
			<span
				data-slot={`${testId}-price`}
				class={[
					listLine,
					doctor.fee.kind === 'amount' ? 'text-foreground' : 'text-muted-foreground',
					signInForFee && actionRoom
				]}
			>
				{#if signInForFee}<FeeSignIn
						label={doctor.fee.label}
						onPress={onSignIn}
						testId={`${testId}-sign-in`}
					/>{:else}{doctor.fee.label}{/if}
			</span>
			<span
				data-slot={`${testId}-rating`}
				class="flex flex-row items-center gap-2.5 text-body-sm text-foreground"
			>
				<!-- NIT-7 (r1): plain text kept whole (`nowrap`): the no-break space alone parts ★ and the number (the
				     prototype's 4), never a flex gap around it as well. -->
				<span class="whitespace-nowrap"
					><span data-slot={`${testId}-star`} class="text-rating">★</span>&nbsp;<span
						class={doctor.reviewCountLabel ? 'font-semibold text-primary-text' : 'text-foreground'}
						>{doctor.ratingLabel}</span
					></span
				>
				{#if doctor.reviewCountLabel}
					<span
						data-slot={`${testId}-reviews`}
						class="inline-flex items-center gap-1 text-muted-foreground"
					>
						<Ionicon name="chatbubble-outline" class="icon-sm" />
						{doctor.reviewCountLabel}
					</span>
				{/if}
			</span>
		</span>
	{:else}
		<p data-slot={`${testId}-name`} class="line-clamp-2 text-body-sm font-semibold text-foreground">
			{doctor.name}
		</p>
		{#if facts}
			<!-- U-27.3 (app = web): «Ειδικότητα · Περιοχή» in the text colour. -->
			<p class={[line, 'font-normal text-foreground']}>{facts}</p>
		{/if}
		{#if doctor.availabilityLabel}
			<p data-slot={`${testId}-availability`} class={[line, 'font-semibold text-primary-text']}>
				{doctor.availabilityLabel}
			</p>
		{/if}
		<p
			data-slot={`${testId}-price`}
			class={[
				line,
				'font-normal',
				doctor.fee.kind === 'amount' ? 'text-foreground' : 'text-muted-foreground',
				signInForFee && actionRoom
			]}
		>
			<!-- U-27.4: «🔒 Συνδεθείτε για κόστος · ★ 4,9» — the first part alone is the action, inline in the SAME
			     line (its 13, its height, its two-line clamp), « · ★ 4,9» as before, wrapping with it as text. -->
			{#if signInForFee}<FeeSignIn
					label={doctor.fee.label}
					onPress={onSignIn}
					testId={`${testId}-sign-in`}
				/>{:else}{doctor.fee.label}{/if} ·
			<span data-slot={`${testId}-rating`} class="whitespace-nowrap"
				><span data-slot={`${testId}-star`} class="text-rating">★</span>&nbsp;<span
					class="text-foreground">{doctor.ratingLabel}</span
				></span
			>
		</p>
	{/if}
</MediaCard>
