<script lang="ts" module>
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	/** The shared `containers` widths: 360 · 480 · 560 · 568 · 760 · 1120 · 1440 · 1920, or `full` (no cap). */
	export type ContainerWidth =
		| 'full'
		| 'narrow'
		| 'text'
		| 'form'
		| 'dialog'
		| 'content'
		| 'listing'
		| 'page'
		| 'wide';
	/** The layout zones of the shared breakpoints: below 744, then 744 · 950 · 1128 · 1440 · 1920. */
	export type ContainerZone = 'phone' | 'tablet' | 'split' | 'laptop' | 'desktop' | 'wide';
	export type ContainerGutter = 'zone' | 'none';

	/**
	 * A width's cap per zone, in full class names (Tailwind reads no built strings), so a zone's width is CSS and
	 * the server already renders it (no JS zone, unlike the application's `useResponsiveLayout`).
	 */
	export const containerWidthClasses: Record<ContainerZone, Record<ContainerWidth, string>> = {
		phone: {
			full: 'max-w-none',
			narrow: 'max-w-narrow',
			text: 'max-w-text',
			form: 'max-w-form',
			dialog: 'max-w-dialog',
			content: 'max-w-content',
			listing: 'max-w-listing',
			page: 'max-w-page',
			wide: 'max-w-wide'
		},
		tablet: {
			full: 'tablet:max-w-none',
			narrow: 'tablet:max-w-narrow',
			text: 'tablet:max-w-text',
			form: 'tablet:max-w-form',
			dialog: 'tablet:max-w-dialog',
			content: 'tablet:max-w-content',
			listing: 'tablet:max-w-listing',
			page: 'tablet:max-w-page',
			wide: 'tablet:max-w-wide'
		},
		split: {
			full: 'split:max-w-none',
			narrow: 'split:max-w-narrow',
			text: 'split:max-w-text',
			form: 'split:max-w-form',
			dialog: 'split:max-w-dialog',
			content: 'split:max-w-content',
			listing: 'split:max-w-listing',
			page: 'split:max-w-page',
			wide: 'split:max-w-wide'
		},
		laptop: {
			full: 'laptop:max-w-none',
			narrow: 'laptop:max-w-narrow',
			text: 'laptop:max-w-text',
			form: 'laptop:max-w-form',
			dialog: 'laptop:max-w-dialog',
			content: 'laptop:max-w-content',
			listing: 'laptop:max-w-listing',
			page: 'laptop:max-w-page',
			wide: 'laptop:max-w-wide'
		},
		desktop: {
			full: 'desktop:max-w-none',
			narrow: 'desktop:max-w-narrow',
			text: 'desktop:max-w-text',
			form: 'desktop:max-w-form',
			dialog: 'desktop:max-w-dialog',
			content: 'desktop:max-w-content',
			listing: 'desktop:max-w-listing',
			page: 'desktop:max-w-page',
			wide: 'desktop:max-w-wide'
		},
		wide: {
			full: 'wide:max-w-none',
			narrow: 'wide:max-w-narrow',
			text: 'wide:max-w-text',
			form: 'wide:max-w-form',
			dialog: 'wide:max-w-dialog',
			content: 'wide:max-w-content',
			listing: 'wide:max-w-listing',
			page: 'wide:max-w-page',
			wide: 'wide:max-w-wide'
		}
	};

	/** The page's side gutter (the application's `gutterOf`): 24, 32 from 950, 48 from 1440 (and from 1920). */
	export const containerGutterClasses: Record<ContainerGutter, string> = {
		zone: 'px-gutter-sm split:px-gutter-md desktop:px-gutter-lg',
		none: ''
	};

	const ZONES: ContainerZone[] = ['phone', 'tablet', 'split', 'laptop', 'desktop', 'wide'];

	/**
	 * The cap classes of a width, or of a width per zone (each zone keeps the last one named below it). A column that is
	 * the `page` at 1440 widens to the `wide` 1920 from 1920 (Airbnb's 4K zone, U-04.1), unless the caller names `wide`.
	 */
	export function containerWidthClassesOf(
		width: ContainerWidth,
		widthByZone: Partial<Record<ContainerZone, ContainerWidth>> = {}
	): string {
		let current: ContainerWidth = widthByZone.phone ?? width;
		const classes = ZONES.map((zone) => {
			const named = zone === 'phone' ? current : widthByZone[zone];
			if (zone === 'wide' && !named)
				return current === 'page' ? containerWidthClasses.wide.wide : '';
			if (named) current = named;
			return named ? containerWidthClasses[zone][named] : '';
		});
		return classes.filter(Boolean).join(' ');
	}

	export type ContainerProps = HTMLAttributes<HTMLElement> & {
		/** The cap of the column (`containers`). Defaults to `page`, the frame's 1440 (1920 from 1920). */
		width?: ContainerWidth;
		/** Another cap from a zone up, e.g. `{ tablet: 'listing' }` over a `content` phone column. */
		widthByZone?: Partial<Record<ContainerZone, ContainerWidth>>;
		/** `zone`: the page gutter of the width zone; `none`: the caller pads. */
		gutter?: ContainerGutter;
		/** The tag: the container is layout, the tag is the meaning (`main`, `section`, `header` …). */
		as?: string;
		children?: Snippet;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		width = 'page',
		widthByZone,
		gutter = 'zone',
		as = 'div',
		class: className,
		children,
		...restProps
	}: ContainerProps = $props();
</script>

<!-- The application's centred column (`w-full self-center` + `maxWidth` + the zone's gutter, `ScreenShell`). -->
<svelte:element
	this={as}
	data-slot="container"
	data-width={width}
	class={cn(
		'mx-auto w-full',
		containerWidthClassesOf(width, widthByZone),
		containerGutterClasses[gutter],
		className
	)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
