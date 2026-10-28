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
		'brand-mark': 40,
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
		'cta-inline': 32
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
 * curve, measured, U-14.1): a photo that loads goes 0 ⇒ 1 on `duration-reveal ease-standard`. They play whatever
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
		reveal: 800
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

/** The theme keys `tailwind-merge` needs to tell our named sizes apart from colors and each other. */
export const mergeTheme = {
	text: Object.keys(typography),
	spacing: Object.keys(spacingScale),
	radius: Object.keys(radius),
	container: Object.keys(containers),
	leading: Object.keys(leading),
	shadow: Object.keys(elevation)
};
