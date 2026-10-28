<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BrandApple } from '$shared/ui/icons/brand-apple';
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	// The application's meta (`atoms/icon-button`): its `accessibilityLabel` / `name` are the web's `aria-label` / `icon`.
	const { Story } = defineMeta({
		title: 'Primitives/IconButton',
		component: IconButton,
		tags: ['autodocs'],
		args: {
			'aria-label': 'Φίλτρα',
			icon: 'options-outline'
		},
		argTypes: {
			appearance: { control: 'select', options: ['bare', 'outline', 'scrim', 'tint', 'tile'] },
			count: { control: { type: 'number', min: 0 } },
			iconSize: { control: 'radio', options: ['md', 'lg'] },
			iconTone: { control: 'radio', options: ['foreground', 'secondary', 'muted'] },
			size: { control: 'select', options: ['xs', 'sm', 'md', 'touch', 'xl'] },
			surface: { control: 'select', options: ['card', 'muted', 'subtle', 'soft', 'strong'] }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<IconButton {...args} />
	{/snippet}
</Story>

<Story name="Active With Count" args={{ count: 2 }}>
	{#snippet template(args)}
		<IconButton {...args} />
	{/snippet}
</Story>

<!-- The 13 looks of the application (study §3 D1), each with the props that draw it; #11 is `FavoriteButton`.
     One row per look, as the application's `Look`: the button(s), then the caption, 12 apart. -->
<Story name="All Looks">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<div class="flex flex-row items-center gap-3">
				<IconButton aria-label="Πίσω" icon="arrow-back" size="touch" iconSize="lg" />
				<IconButton
					aria-label="Φίλτρα, 2"
					icon="options-outline"
					count={2}
					size="touch"
					iconSize="lg"
				/>
				<span class="text-body-sm text-muted-foreground">#1 bare · touch · lg</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Κλείσιμο"
					appearance="outline"
					icon="close"
					size="touch"
					iconSize="lg"
				/>
				<span class="text-body-sm text-muted-foreground">#2 outline · touch · lg</span>
			</div>
			<div class="bg-muted p-2">
				<div class="flex flex-row items-center gap-3">
					<IconButton
						aria-label="Κοινοποίηση"
						appearance="scrim"
						icon="share-social-outline"
						size="touch"
						iconSize="md"
						iconTone="secondary"
					/>
					<span class="text-body-sm text-muted-foreground">#3 scrim · touch · md · secondary</span>
				</div>
			</div>
			<div class="bg-background p-2">
				<div class="flex flex-row items-center gap-3">
					<IconButton
						aria-label="Περισσότερα"
						appearance="tint"
						icon="arrow-forward"
						size="sm"
						iconSize="md"
					/>
					<IconButton
						aria-label=""
						appearance="tint"
						icon="arrow-forward"
						size="sm"
						iconSize="md"
						decorative
						class="mt-0.5"
					/>
					<span class="text-body-sm text-muted-foreground"
						>#4 tint card · sm · md (and decorative)</span
					>
				</div>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Πίσω"
					appearance="tint"
					surface="subtle"
					icon="chevron-back"
					size="sm"
					iconSize="md"
				/>
				<span class="text-body-sm text-muted-foreground">#5 tint subtle · sm · md</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Κλείσιμο"
					appearance="tint"
					surface="soft"
					icon="close"
					size="xs"
					iconSize="md"
				/>
				<span class="text-body-sm text-muted-foreground">#6 tint soft · xs · md</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Ιστότοπος"
					appearance="tint"
					surface="strong"
					icon="globe-outline"
					size="sm"
					iconSize="md"
				/>
				<span class="text-body-sm text-muted-foreground">#7 tint strong · sm · md</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Ιστότοπος"
					appearance="tint"
					surface="strong"
					icon="globe-outline"
					size="touch"
					iconSize="md"
					href="#"
				/>
				<span class="text-body-sm text-muted-foreground">#8 tint strong · touch · md · link</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Καθαρισμός"
					appearance="tint"
					surface="muted"
					icon="close"
					size="xs"
					iconSize="md"
				/>
				<span class="text-body-sm text-muted-foreground">#9 tint muted · xs · md</span>
			</div>
			<div class="bg-muted p-2">
				<div class="flex flex-row items-center gap-3">
					<IconButton
						aria-label=""
						appearance="tint"
						icon="expand-outline"
						size="md"
						iconSize="md"
						decorative
					/>
					<span class="text-body-sm text-muted-foreground">#10 tint card · md · decorative</span>
				</div>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton
					aria-label="Καθαρισμός"
					icon="close-circle"
					size="touch"
					iconSize="md"
					iconTone="muted"
				/>
				<span class="text-body-sm text-muted-foreground">#12 bare · md · muted</span>
			</div>
			<div class="flex flex-row items-center gap-3">
				<IconButton aria-label="Google" appearance="tile" size="xl">
					<BrandGoogle class="icon-lg" />
				</IconButton>
				<IconButton aria-label="Apple" appearance="tile" size="xl" busy>
					<BrandApple class="icon-lg" />
				</IconButton>
				<span class="text-body-sm text-muted-foreground">#13 tile · xl (and busy)</span>
			</div>
		</div>
	{/snippet}
</Story>

<!-- The shape alone, without the 48 box: a tint card arrow (40) and a tile with the Google mark (64). -->
<Story name="Decorative">
	{#snippet template()}
		<div class="flex flex-row items-center gap-4">
			<IconButton
				aria-label=""
				appearance="tint"
				icon="arrow-forward"
				size="sm"
				iconSize="md"
				decorative
			/>
			<IconButton aria-label="" appearance="tile" size="xl" decorative>
				<BrandGoogle class="icon-lg" />
			</IconButton>
		</div>
	{/snippet}
</Story>

<!-- The scrim is 48 only, the tile 48 or 64, and the lift falls only from a 48 / 64 shape. -->
<Story name="Own Shape Sizes">
	{#snippet template()}
		<div class="flex flex-row flex-wrap items-center gap-4 rounded-md bg-muted p-4">
			<IconButton aria-label="Apple" appearance="tile" size="touch">
				<BrandApple class="icon-lg" />
			</IconButton>
			<IconButton aria-label="Apple" appearance="tile" size="xl">
				<BrandApple class="icon-lg" />
			</IconButton>
			<IconButton aria-label="Κλείσιμο" appearance="outline" icon="close" elevated />
			<IconButton
				aria-label="Μεγέθυνση"
				appearance="tint"
				icon="expand-outline"
				size="xl"
				iconSize="md"
			/>
			<IconButton
				aria-label="Μεγέθυνση"
				appearance="tint"
				icon="expand-outline"
				size="md"
				iconSize="md"
			/>
		</div>
	{/snippet}
</Story>
