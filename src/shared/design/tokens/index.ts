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
		'textarea-md': 64,
		'textarea-lg': 80,
		'textarea-xl': 96,
		'histogram-sm': 80,
		'histogram-md': 112,
		'histogram-lg': 128,
		'dropzone-min-h': 288,
		'drawer-handle': 48,
		'drawer-inset': 96
	},
	motion: {
		drawer: 360,
		sheet: 320,
		dismiss: 80
	}
} as const;

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
