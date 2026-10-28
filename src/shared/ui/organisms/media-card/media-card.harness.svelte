<script lang="ts">
	import { untrack } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { MetaRow, type MetaRowItem } from '$shared/ui/molecules/meta-row';
	import { PhotoCarousel } from '$shared/ui/organisms/photo-carousel';
	import { FavoriteButton } from '$shared/ui/primitives/favorite-button';
	import { MapThumbnail } from '$shared/ui/primitives/map-thumbnail';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import { PriceLabel } from '$shared/ui/primitives/price-label';
	import { MediaCard } from './index';
	import {
		photoPosition,
		sampleArticles,
		sampleDoctors,
		sampleScrollLabels,
		type SampleArticle,
		type SampleDoctor
	} from './media-card.sample';

	/**
	 * The application's two cards built from the kit, for the stories and the tests: the doctor card
	 * (`search-doctor-card`, rail `carousel` and results `list`) and the framed article card (`articles/…/article-card`).
	 */
	let {
		card = 'doctor',
		variant = 'carousel',
		locale = 'el',
		doctor,
		article = sampleArticles[0],
		initialFavorite = false,
		onSignIn = () => {},
		onFavorite = () => {}
	}: {
		card?: 'doctor' | 'article';
		variant?: 'carousel' | 'list';
		locale?: 'el' | 'en';
		doctor?: SampleDoctor;
		article?: SampleArticle;
		initialFavorite?: boolean;
		onSignIn?: () => void;
		onFavorite?: (next: boolean) => void;
	} = $props();

	let favorite = $state(untrack(() => initialFavorite));
	const shown = $derived(doctor ?? sampleDoctors[locale][0]);
	const list = $derived(variant === 'list');
	// The application's size table (`search-doctor-card:47-54`), as zone classes.
	const doctorWidth = $derived(list ? 'w-full' : 'w-card-rail-w tablet:w-card-rail-w-lg');
	const doctorMedia = $derived(
		list
			? 'h-card-list-media tablet:h-card-list-media-lg'
			: 'h-card-rail-media tablet:h-card-rail-media-lg'
	);
	const metaLine = $derived(list ? 'text-body-md' : 'text-label-lg');
	const metaItems = $derived<MetaRowItem[]>([
		...(shown.online
			? [
					{
						key: 'online',
						icon: 'videocam-outline',
						iconTone: 'primary',
						label: shown.online,
						tone: list ? 'foreground' : 'muted',
						size: list ? 'lg' : 'sm',
						singleLine: true
					} satisfies MetaRowItem
				]
			: []),
		{
			key: 'rating',
			icon: 'star',
			iconTone: 'rating',
			label: shown.rating,
			tone: 'primary',
			emphasis: true,
			labelTestId: 'card-rating'
		},
		...(shown.reviews
			? [
					{
						key: 'reviews',
						icon: 'chatbubble-ellipses-outline',
						iconTone: 'muted',
						label: shown.reviews,
						tone: 'muted',
						testId: 'card-review-count'
					} satisfies MetaRowItem
				]
			: [])
	]);
	const slides = $derived(
		shown.photos.map((uri, index) => ({
			uri,
			ariaLabel: photoPosition[locale](index + 1, shown.photos.length)
		}))
	);
</script>

{#if card === 'doctor'}
	{#snippet gallery()}
		<PhotoCarousel
			{slides}
			href={`#${shown.slug}`}
			imageClass={doctorMedia}
			scrollLabels={sampleScrollLabels[locale]}
			data-testid="card-gallery"
		/>
	{/snippet}
	{#snippet badge()}
		{#if shown.badge}<MediaBadge besideAction label={shown.badge} maxLines={2} width="badge" />{/if}
	{/snippet}
	{#snippet action()}
		<FavoriteButton
			selected={favorite}
			onToggle={(next) => {
				favorite = next;
				onFavorite(next);
			}}
			aria-label={shown.favoriteLabel}
			size={list ? 'lg' : 'md'}
			inset={list ? 'md' : 'sm'}
		/>
	{/snippet}
	{#snippet overlay()}
		<MapThumbnail />
	{/snippet}

	<MediaCard
		href={`#${shown.slug}`}
		linkLabel={shown.profileLabel}
		class={doctorWidth}
		imageClass={doctorMedia}
		imageUrl={shown.photos[0] ?? null}
		media={list && shown.photos.length > 1 ? gallery : undefined}
		{badge}
		{action}
		overlay={list ? overlay : undefined}
		data-testid="card"
	>
		<div class="flex flex-col gap-1">
			<div class="flex min-h-touch w-full flex-col gap-1">
				<p
					data-testid="card-name"
					class={cn(
						'line-clamp-1 font-semibold text-foreground',
						list ? 'text-title-lg tablet:text-heading-sm' : 'text-body-lg'
					)}
				>
					{shown.name}
				</p>
				<p
					data-testid="card-specialty"
					class={cn('line-clamp-1 text-foreground', list ? 'text-title-xs' : 'text-body-md')}
				>
					{shown.specialty}
				</p>
				{#if list}
					<p class="line-clamp-2 text-body-md text-muted-foreground" data-testid="card-description">
						{shown.description}
					</p>
				{/if}
				<p data-testid="card-place" class={cn('line-clamp-1 text-foreground', metaLine)}>
					{list ? shown.location : shown.city}
				</p>
				<p data-testid="card-availability" class={cn('font-semibold text-primary-text', metaLine)}>
					{shown.availability}
				</p>
			</div>

			{#if shown.fee.kind === 'action'}
				<PriceLabel
					kind="action"
					label={shown.fee.label}
					placement={list ? 'card-list' : 'card'}
					onAction={onSignIn}
				/>
			{:else}
				<PriceLabel
					kind={shown.fee.kind}
					label={shown.fee.label}
					placement={list ? 'card-list' : 'card'}
					data-testid="card-fee"
				/>
			{/if}

			<MetaRow items={metaItems} size={list ? 'md' : 'xs'} />
		</div>
	</MediaCard>
{:else}
	{@const rail = variant === 'carousel'}
	{#snippet articleBadge()}
		<MediaBadge label={article.type} />
	{/snippet}
	<MediaCard
		variant="framed"
		href={`#${article.slug}`}
		linkLabel={article.openLabel}
		class={rail ? 'w-article-rail-w tablet:w-article-rail-w-lg' : 'w-full'}
		imageClass={rail
			? 'h-article-rail-media tablet:h-article-rail-media-lg'
			: 'h-article-list-media tablet:h-article-list-media-lg'}
		imageUrl={article.image}
		badge={articleBadge}
		data-testid="card"
	>
		<div class="flex flex-col gap-1.5 px-1 pt-1">
			<div class="flex min-h-touch w-full flex-col gap-1.5">
				<p
					data-testid="card-title"
					class={cn(
						'line-clamp-2 font-semibold text-foreground',
						rail
							? 'text-body-sm leading-tight'
							: 'text-body-lg max-tablet:leading-tight tablet:text-title-sm'
					)}
				>
					{article.title}
				</p>
				{#if article.meta}
					<p class="line-clamp-1 text-label-md text-muted-foreground">{article.meta}</p>
				{/if}
				<p class="line-clamp-2 text-body-sm text-muted-foreground">{article.excerpt}</p>
			</div>
			<!-- «Διαβάστε» keeps the application's 48 row; the card itself is the link. -->
			<span
				data-testid="card-read"
				class="inline-flex min-h-touch min-w-touch items-center gap-1.5 self-start text-label-lg font-semibold text-foreground underline"
			>
				{article.readLabel}
			</span>
		</div>
	</MediaCard>
{/if}
