import {
	containers,
	controls,
	elevation,
	leading,
	media,
	radius,
	sheet,
	spacing,
	steps,
	typography
} from './tokens';

export {
	breakpoints,
	containers,
	controls,
	elevation,
	field,
	icon,
	leading,
	media,
	radius,
	sheet,
	spacing,
	steps,
	switchGeometry,
	textScale,
	tracking,
	typography
} from './tokens';
export type { FieldBox, SwitchBox, TypographyToken } from './tokens';

export type TypographyRole = keyof typeof typography;

/** The product's name as the UI writes it (the application's token, U-03.7); no component spells it out. */
export const brandName = 'edoctor';

// Web-only sizes with no counterpart in the shared scale; they reach the theme next to the shared names.
export const platform = {
	spacing: {
		'bar-top': 64,
		// The top bar's «e+» square (U-16.8): the prototype's 26 is off the 4px grid every name keeps, so 24.
		'brand-mark': 24,
		'icon-tile': 48,
		'dial-code-w': 56,
		'menu-max-h': 288,
		'menu-min-w': 160,
		'popover-sm': 224,
		'popover-md': 288,
		'popover-lg': 320,
		// The application's hover card width (its platform name, same value): `HoverCard` `md`, the default (R7-2).
		'hover-card-w': 256,
		'textarea-md': 64,
		'textarea-lg': 80,
		'textarea-xl': 96,
		'histogram-sm': 80,
		'histogram-md': 112,
		'histogram-lg': 128,
		// The application's platform names for the price filter's min / max columns (`RangeHistogram`), same values.
		'range-field-sm': 112,
		'range-field-md': 144,
		'range-field-lg': 160,
		'dropzone-min-h': 288,
		'drawer-handle': 48,
		'drawer-inset': 96,
		// The application's platform name for the pill CTA's inline padding (`StickyActionBar`), same name, same value.
		'cta-inline': 32,
		// Wave 1.0 frame (U-16 ⇒ U-19, the approved prototype): apple.com's top bar box (980 + 22 a side), the glass
		// tab capsule below 744 (U-82.3: four tabs, 4 × 84), the account menu and the floating consent card from 744.
		'bar-content': 1024,
		'tab-capsule-w': 336,
		'account-menu-w': 260,
		'consent-card-w': 720,
		// Wave 1.0 search (U-23.2): Airbnb's panel under the bar from 744, 425 wide — 424 on the 4px grid.
		'search-panel-w': 424,
		// The top bar's small search pill (U-16.7): each of its three parts at most 224 before «…» (NIT-7 of U-29: its
		// own name, the value it had as `popover-sm`).
		'compact-search-part': 224,
		// Wave 1.0 results (U-24.4, §7.1–7.2 of the wave record, the prototype's numbers): the price pin's 28, the pin
		// card's 128 photo, the pin card over the phone's sheet (184) and over the 744 map switch (96), the phone
		// sheet's top strip when only «Βρέθηκαν N» shows (168), the phone list's end clearing the capsule (150 ⇒ 152)
		// and the results grid's row gap (Airbnb's 28 × 24, §7.4).
		'pill-inset': 44,
		'results-row-gap': 28,
		'map-pin': 28,
		'map-card-media': 128,
		'map-card-over-sheet': 184,
		'map-card-over-switch': 96,
		'map-sheet-peek': 168,
		'results-list-end': 152,
		// The 744 map switch's distance from the bottom edge (NIT-7 of U-29, U-32.3: its own name, the value it had as
		// `control-xs`).
		'map-switch-bottom': 32,
		// Wave 1.5 · screen 5, the profile (U-41.1, the prototype `?ph=a`, the application's names): the `MediaGallery`'s
		// square from 744 held between 260 and 360 (`w-gallery-fluid`: the prototype's `clamp(260px, 26vw, 360px)`) and
		// its 56 thumbnails; the profile's sides from 744 and 1128 (Airbnb's 40 / 80); the section bar (fixed 80); the
		// sticky card's top (the section bar 80 + 24); the wide window of the reviews and the location (1032).
		'gallery-main': 260,
		'gallery-main-lg': 360,
		'gallery-thumb': 56,
		'profile-gutter': 40,
		'profile-gutter-lg': 80,
		'section-bar': 80,
		'card-sticky-top': 104,
		'window-wide': 1032,
		// The profile's office map (the prototype's `.p-map`): 300 on the phone, 400 from 744, 480 from 1128.
		'office-map': 300,
		'office-map-md': 400,
		'office-map-lg': 480,
		// The profile's two columns of a section from 744 (Airbnb's 64 between them) and its reviews' rows (40).
		'profile-columns': 64,
		'review-rows': 40,
		// Wave 1.5 · screens 6–10 (U-57.4, U-59.1, U-62.1, the approved prototypes 06/07/10): the `DocumentPage`'s text
		// column from 1128 (600; 568 = `container-dialog` at 744–1127), its sticky aside (320) and the FAQ's wider
		// column (U-60.1, 720: the top of the text pages' 600–720).
		'document-column': 600,
		'document-aside': 320,
		'document-wide': 720,
		// Their rhythm, off the 4 grid's first six steps: a heading's room above (40 · 36 in a legal text), the
		// breadcrumbs' top (28), the sticky «Σε αυτό το …» row below 744 (52) and the gap before «Περισσότερα άρθρα»
		// and between the FAQ's topics (56).
		'reading-gap': 40,
		'reading-gap-sm': 36,
		'reading-crumbs': 28,
		'reading-row': 52,
		'reading-more': 56,
		// The status page's picture from 1128 (U-61.1, the prototype 09: 440 beside the words; 320 below 1128).
		'status-art': 440,
		// Wave 2 · screen 11 (U-66.2 Ε1): the reviews' window of one column, 664 at 744–1127 (720 = `document-wide` from
		// 1128) and 800 high at most. Screen 13 (U-68.1 Ε1): the office's text column from 1128 (320 = `document-aside`).
		'window-reviews-sm': 664,
		'window-h': 800,
		'office-aside': 400,
		// Screens 14, 15 (U-70, U-72): the window of the services and the fields of expertise, Airbnb's 780.
		'window-md': 780,
		// U-70 Π5 / U-73 Π3: the widths of the box at which a row keeps its fee beside it and a card its numbers.
		'row-wide': 520,
		'card-wide': 340,
		// Screens 18 + 21 (U-84): the inbox's list from 950 and from 1128; a bubble's most from 744 and the avatar beside
		// it, the composer's pill and its «↑», all from 744 (below it the application's, U-81.2); its six lines, which are
		// also where the #18's field starts, and that field's
		// most; «Επικοινωνήστε με τον γιατρό» from 744; the pill «Προφίλ» of a conversation's bar.
		'inbox-list-w': 380,
		'inbox-list-w-lg': 400,
		'inbox-art-w': 168,
		'bubble-max-w': 560,
		'bubble-avatar': 28,
		'composer-min-h': 44,
		'composer-send': 36,
		'composer-field': 156,
		'compose-field-max': 320,
		'contact-w': 288,
		'thread-pill-h': 36,
		// The message in quote of a report: past it, it scrolls.
		'quote-max-h': 140,
		// Wave 3 · screens 33–42 (record §6.3, the approved prototype's `doctor.css`): the steps' column (Airbnb's 630, 628
		// on the 4 grid), the steps' own top bar from 744 (80) and the pills on it (36 below 744; 40 = `control-sm` from it).
		'wizard-column': 628,
		'wizard-top': 80,
		'wizard-pill': 36,
		// Wave 3 · screen 30 (record §3.4, Airbnb's checkout measured 05/11): the one column from 744 (440); from 950 the
		// two (`grid-checkout`): the panel 386 ⇒ 384 on the 4 grid, 440 from 1128, 524 from 1440, beside the card 332,
		// 368, 372, 64 apart (80 from 1128); the card's photo (80 below 744, `avatar-2xl` 96 from it) and the note's 104.
		'checkout-main': 384,
		'checkout-main-lg': 440,
		'checkout-main-xl': 524,
		'checkout-aside': 332,
		'checkout-aside-lg': 368,
		'checkout-aside-xl': 372,
		'checkout-gap': 64,
		'checkout-gap-lg': 80,
		'checkout-photo': 80,
		'checkout-note': 104
	},
	// The sixth corner (U-25.4): 32, ONLY for the web's panels and windows from 744 (`rounded-panel`: the search
	// panel 425, the filters window 568). The shared five (`radius`) stay the application's.
	radius: {
		panel: 32,
		// Screen 21 (U-84.1, the approved prototype): a message's corner and the one that joins it to the next of its group.
		bubble: 20,
		'bubble-tail': 6
	},
	// The frosted surfaces of the frame (U-16.8, U-16.10): `backdrop-blur-bar` (apple.com's 20) and
	// `backdrop-blur-glass` (the capsule's 7), emitted as the theme's `--blur-*`; `backdrop-blur-search` the
	// phone's search window over the page (U-23.2, 18).
	blur: {
		bar: 20,
		glass: 7,
		search: 18
	},
	// The drag distance that closes a drawer whose size cannot be measured; the panels travel their own size (U-09.8).
	motion: {
		dismiss: 80
	}
} as const;

/**
 * The kit's motion, web-only names in ONE place (U-09.8): durations in ms and curves as CSS cubic-béziers. The
 * theme makes them `duration-<name>` / `ease-<name>` classes; every motion of the web is CSS on them (U-12.2).
 * Where the application animates the same unit, its numbers: `sheet` gorhom's (5.2.14 `ANIMATION_CONFIGS`): 250 ms
 * `Easing.out(Easing.exp)` on Android, a spring on iOS (damping 500, stiffness 1000, mass 3, `overshootClamping`;
 * ~95 % at 0.26 s) — the web keeps 250 ms `expoOut` as the one curve near both; `accordion` its `accordionAnimationDuration` + Reanimated's `withTiming` default
 * `Easing.inOut(Easing.quad)`, `zoom` its `MODAL_ANIMATION_DURATION` (open `out(cubic)`, close `in(cubic)`),
 * `label` the `FloatingLabel`'s `labelAnimationDuration` + the same `withTiming` default, `segment` the
 * `SegmentedControl`'s `THUMB_SLIDE_DURATION_MS` + `out(cubic)`. Every other motion is Airbnb's
 * 0.25 s `cubic-bezier(0.2, 0, 0, 1)` (`standard`); `reveal` is Airbnb's fade of what arrives (0.8 s on that same
 * curve, measured, U-14.1): a photo that loads goes 0 ⇒ 1 on `duration-reveal ease-standard`; `consent` is Airbnb's
 * consent card rising in and out (0.4 s on that curve, the wave record §4.5). They play whatever
 * the device's motion setting (U-12.1).
 */
export const motion = {
	duration: {
		standard: 250,
		sheet: 250,
		accordion: 220,
		zoom: 220,
		label: 200,
		segment: 180,
		reveal: 800,
		consent: 400
	},
	easing: {
		standard: [0.2, 0, 0, 1],
		sheet: [0.16, 1, 0.3, 1],
		accordion: [0.45, 0, 0.55, 1],
		'zoom-in': [0.33, 1, 0.68, 1],
		'zoom-out': [0.32, 0, 0.67, 0],
		label: [0.45, 0, 0.55, 1],
		segment: [0.33, 1, 0.68, 1]
	}
} as const;

export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;

/** A curve of `motion.easing` as CSS. */
export function cubicBezierCss(name: MotionEasing): string {
	return `cubic-bezier(${motion.easing[name].join(', ')})`;
}

/**
 * The modal panel's fade (the application's `panelStyle`, U-12.2): none while the zoom's progress is under
 * `hiddenUntil`, then linear in it. The theme draws it as `ease-modal-panel-in | out`, two curves for
 * `transition-[translate,opacity]`: the rise on the zoom's own curve, the fade on `linear()` points of it.
 */
export const panelFade = { hiddenUntil: 0.35, points: 24 } as const;

/**
 * A CSS `cubic-bezier(x1, y1, x2, y2)` as a function of time: x(s) is solved for s by Newton's method, with a
 * bisection when the slope is flat, then y(s) is the eased progress (the browser's own algorithm).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
	const ax = 3 * x1 - 3 * x2 + 1;
	const bx = 3 * x2 - 6 * x1;
	const cx = 3 * x1;
	const ay = 3 * y1 - 3 * y2 + 1;
	const by = 3 * y2 - 6 * y1;
	const cy = 3 * y1;
	const xAt = (s: number) => ((ax * s + bx) * s + cx) * s;
	const yAt = (s: number) => ((ay * s + by) * s + cy) * s;
	const slopeAt = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
	return (t: number) => {
		if (t <= 0) return 0;
		if (t >= 1) return 1;
		let s = t;
		for (let index = 0; index < 8; index += 1) {
			const error = xAt(s) - t;
			const slope = slopeAt(s);
			if (Math.abs(error) < 1e-7) return yAt(s);
			if (Math.abs(slope) < 1e-6) break;
			s -= error / slope;
		}
		let low = 0;
		let high = 1;
		s = t;
		while (high - low > 1e-7) {
			if (xAt(s) < t) low = s;
			else high = s;
			s = (low + high) / 2;
		}
		return yAt(s);
	};
}

/**
 * A length on the shared step scale: `step(3)` is what the class `p-3` renders. Runtime code (a menu's
 * `sideOffset`, a viewport padding, a minimum thumb) reads small lengths through this, never as a number.
 */
export function step(count: number): number {
	return count * steps.base;
}

/**
 * Every `--spacing-<name>` the theme defines, name ⇒ CSS value: the shared spacing, control and media
 * names, the web-only names and the sheet heights (in `dvh`). The theme generator and the class merger
 * both read this one list, so a class the merger knows is always a class the theme emits.
 */
export const spacingScale: Readonly<Record<string, string>> = Object.fromEntries([
	...[spacing, controls, media, platform.spacing].flatMap((family) =>
		Object.entries(family).map(([name, value]): [string, string] => [name, `${value}px`])
	),
	...Object.entries(sheet).map(([name, value]): [string, string] => [
		`sheet-${name}`,
		`${value}dvh`
	])
]);

/** Every `--radius-<name>` the theme defines: the shared five, then the web's panel corner (U-25.4). */
export const radiusScale: Readonly<Record<string, number>> = { ...radius, ...platform.radius };

/** The theme keys `tailwind-merge` needs to tell our named sizes apart from colors and each other. */
export const mergeTheme = {
	text: Object.keys(typography),
	spacing: Object.keys(spacingScale),
	radius: Object.keys(radiusScale),
	container: Object.keys(containers),
	leading: Object.keys(leading),
	shadow: Object.keys(elevation)
};
