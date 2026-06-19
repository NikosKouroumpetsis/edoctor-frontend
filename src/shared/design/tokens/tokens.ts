/**
 * Canonical non-color design tokens — SINGLE SOURCE OF TRUTH.
 *
 * Every size in the web app (typography, spacing, radius, elevation,
 * breakpoints, containers, icons) is defined here, in plain numbers (px) and
 * CSS strings. A Vite plugin (`./vite-plugin`) turns this file into the
 * generated Tailwind theme at `src/generated/design-tokens.css`, so editing a
 * value here propagates globally on the next dev reload / build.
 *
 * Colors are intentionally NOT here: they stay in `src/routes/layout.css`
 * (`:root` / `.dark`) and are kept in sync with the eDoctor application theme.
 *
 * Portability: this file has zero imports on purpose. Another SvelteKit front
 * or app can adopt the system by copying the `tokens/` folder, registering the
 * Vite plugin, and `@import`-ing the generated CSS. See
 * `documentation/design-tokens.md`.
 */

/** A complete typographic role: size + default weight + line-height. */
export type TypographyToken = {
	/** Font size in px. */
	size: number;
	/** Default font weight (override per-element with `font-*` when needed). */
	weight: number;
	/** Unitless line-height ratio. */
	lineHeight: number;
};

/**
 * Typography scale. Sizes match the eDoctor scale; each role now carries a
 * default weight and line-height so `text-<role>` renders correctly on its own
 * (no scattered `font-semibold` / `leading-*`). Letter-spacing stays at the
 * project default (0) per the styling guidelines.
 */
export const typography = {
	'display-xl': { size: 44, weight: 700, lineHeight: 1.08 },
	'display-lg': { size: 40, weight: 700, lineHeight: 1.1 },
	'display-md': { size: 36, weight: 700, lineHeight: 1.12 },
	'display-sm': { size: 32, weight: 700, lineHeight: 1.15 },
	'display-xs': { size: 30, weight: 700, lineHeight: 1.18 },
	'heading-xl': { size: 28, weight: 600, lineHeight: 1.2 },
	'heading-lg': { size: 24, weight: 600, lineHeight: 1.25 },
	'heading-md': { size: 21, weight: 600, lineHeight: 1.3 },
	'heading-sm': { size: 19, weight: 600, lineHeight: 1.32 },
	'title-lg': { size: 18, weight: 600, lineHeight: 1.4 },
	'title-md': { size: 17, weight: 600, lineHeight: 1.4 },
	'title-sm': { size: 16, weight: 600, lineHeight: 1.45 },
	'title-xs': { size: 15, weight: 600, lineHeight: 1.45 },
	'body-lg': { size: 16, weight: 400, lineHeight: 1.5 },
	'body-md': { size: 15, weight: 400, lineHeight: 1.5 },
	'body-sm': { size: 14, weight: 400, lineHeight: 1.45 },
	'label-lg': { size: 13, weight: 500, lineHeight: 1.4 },
	'label-md': { size: 12, weight: 500, lineHeight: 1.4 },
	'label-sm': { size: 11, weight: 500, lineHeight: 1.35 }
} as const satisfies Record<string, TypographyToken>;

/**
 * Semantic spacing on top of Tailwind's numeric scale. Names encode a recurring
 * layout decision (a page band, a card's padding, a grid gutter) so the same
 * rhythm is reused instead of re-picking raw numbers. Generates `p-card`,
 * `gap-section`, `space-y-gutter`, etc. Raw `p-4` / `gap-6` stay available for
 * genuine one-offs.
 */
export const spacing = {
	/** Vertical rhythm between major page bands (`gap-section`). */
	section: 32,
	/** Internal padding of a card / panel (`p-card`). */
	card: 24,
	/** Gap between cards or list items in a grid (`gap-gutter`). */
	gutter: 16,
	/** Tight inline gap, e.g. icon + label (`gap-inline`). */
	inline: 8
} as const satisfies Record<string, number>;

/**
 * Border-radius scale (px). The `sm…4xl` steps preserve the previous values
 * exactly; `panel` / `control` / `media` are the named application-parity radii
 * for cards, form controls, and images.
 */
export const radius = {
	sm: 6,
	md: 8,
	lg: 10,
	xl: 14,
	'2xl': 18,
	'3xl': 22,
	'4xl': 26,
	/** Cards / large panels — mirrors the application `rounded-panel`. */
	panel: 28,
	/** Inputs, selects, search controls — `rounded-control`. */
	control: 13,
	/** Images / media — `rounded-media`. */
	media: 24
} as const satisfies Record<string, number>;

/**
 * Elevation scale (raw CSS box-shadow values). Three purposeful levels sharing
 * the same slate base. Tuned for light surfaces (as the application's
 * `shadow-soft` already is); they read faintly in dark mode by design.
 */
export const elevation = {
	/** Level 1 — resting cards / controls. */
	raised: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.1)',
	/** Level 2 — menus, popovers, dropdowns. */
	overlay: '0 8px 24px rgba(15, 23, 42, 0.12)',
	/** Level 3 — large floating panel / modal (application parity, unchanged). */
	soft: '0 22px 54px rgba(15, 23, 42, 0.14)'
} as const satisfies Record<string, string>;

/**
 * Responsive breakpoints (px), mobile-first. Base styles target the 375px
 * mobile design. The desktop top navigation appears from `lg` (1128) up.
 */
export const breakpoints = {
	/** Small phone. */
	sm: 600,
	/** Tablet. */
	md: 744,
	/** Laptop — desktop top nav appears here. */
	lg: 1128,
	/** Desktop. */
	xl: 1280,
	/** Wide. */
	'2xl': 1440
} as const satisfies Record<string, number>;

/** Named content-container widths (px). Use `max-w-page` / `max-w-tablet`. */
export const containers = {
	page: 1440,
	tablet: 744
} as const satisfies Record<string, number>;

/** Icon size scale (px). Generates the `icon-xs … icon-xl` utilities. */
export const icon = {
	xs: 14,
	sm: 16,
	md: 18,
	lg: 20,
	xl: 22
} as const satisfies Record<string, number>;

/** The full non-color token registry, grouped by family. */
export const tokens = {
	typography,
	spacing,
	radius,
	elevation,
	breakpoints,
	containers,
	icon
} as const;

export type Tokens = typeof tokens;
