export type TypographyToken = {
	size: number;
	weight: number;
	lineHeight: number;
};

export type FieldBox = {
	paddingTop: number;
	paddingBottom: number;
	paddingLeft: number;
	text: keyof typeof typography;
	contentHeight: number;
};

export type SwitchBox = {
	padding: number;
	thumb: number;
	trackHeight: number;
	trackWidth: number;
};

// Copy of the canonical scale in application/src/shared/design/tokens/values/index.ts (scale-parity test).
export const typography = {
	'display-xl': { size: 48, weight: 700, lineHeight: 1.08 },
	'display-lg': { size: 44, weight: 700, lineHeight: 1.1 },
	'display-md': { size: 40, weight: 700, lineHeight: 1.12 },
	'display-sm': { size: 36, weight: 700, lineHeight: 1.15 },
	'display-xs': { size: 34, weight: 700, lineHeight: 1.18 },
	'heading-xl': { size: 30, weight: 600, lineHeight: 1.2 },
	'heading-lg': { size: 28, weight: 600, lineHeight: 1.25 },
	'heading-md': { size: 24, weight: 600, lineHeight: 1.3 },
	'heading-sm': { size: 22, weight: 600, lineHeight: 1.32 },
	'title-lg': { size: 20, weight: 600, lineHeight: 1.4 },
	'title-md': { size: 19, weight: 600, lineHeight: 1.4 },
	'title-sm': { size: 18, weight: 600, lineHeight: 1.45 },
	'title-xs': { size: 17, weight: 600, lineHeight: 1.45 },
	'body-lg': { size: 16, weight: 400, lineHeight: 1.5 },
	'body-md': { size: 15, weight: 400, lineHeight: 1.5 },
	'body-sm': { size: 14, weight: 400, lineHeight: 1.45 },
	'label-lg': { size: 13, weight: 500, lineHeight: 1.4 },
	'label-md': { size: 12, weight: 500, lineHeight: 1.4 }
} as const satisfies Record<string, TypographyToken>;

export const leading = {
	flat: 1,
	tight: 1.25,
	normal: 1.5,
	relaxed: 1.75,
	loose: 2
} as const satisfies Record<string, number>;

export const tracking = {
	control: '0.18em',
	eyebrow: '0.24em'
} as const satisfies Record<string, string>;

export const steps = {
	base: 4,
	max: 6
} as const satisfies Record<string, number>;

export const spacing = {
	inline: 8,
	rail: 12,
	list: 16,
	grid: 24,
	card: 24,
	section: 32,
	'section-lg': 48,
	'gutter-sm': 24,
	'gutter-md': 32,
	'gutter-lg': 48,
	indent: 36
} as const satisfies Record<string, number>;

export const controls = {
	touch: 48,
	'touch-gap': 8,
	'control-xs': 32,
	'control-sm': 40,
	'control-md': 48,
	'control-lg': 56,
	'control-xl': 64,
	row: 56,
	'row-lg': 72,
	'bar-bottom': 88,
	'bar-booking': 112,
	'field-inset': 36
} as const satisfies Record<string, number>;

export const field = {
	default: {
		paddingTop: 16,
		paddingBottom: 6,
		paddingLeft: 10,
		text: 'body-lg',
		contentHeight: 24
	},
	lg: { paddingTop: 20, paddingBottom: 10, paddingLeft: 10, text: 'body-lg', contentHeight: 24 },
	xl: { paddingTop: 24, paddingBottom: 10, paddingLeft: 12, text: 'title-sm', contentHeight: 28 }
} as const satisfies Record<string, FieldBox>;

export const switchGeometry = {
	sm: { padding: 2, thumb: 18, trackHeight: 22, trackWidth: 38 },
	md: { padding: 2, thumb: 24, trackHeight: 28, trackWidth: 48 },
	lg: { padding: 2, thumb: 28, trackHeight: 32, trackWidth: 56 }
} as const satisfies Record<string, SwitchBox>;

export const media = {
	'avatar-sm': 32,
	'avatar-md': 40,
	'avatar-lg': 48,
	'avatar-xl': 64,
	'avatar-2xl': 96,
	tile: 56,
	'pin-halo': 80,
	'card-rail-w': 168,
	'card-rail-w-lg': 216,
	'card-rail-media': 152,
	'card-rail-media-lg': 188,
	'card-list-media': 188,
	'card-list-media-lg': 224,
	'article-rail-w': 268,
	'article-rail-w-lg': 300,
	'article-rail-media': 150,
	'article-rail-media-lg': 176,
	'article-list-media': 188,
	'article-list-media-lg': 220,
	'article-group-w': 176,
	'article-group-w-lg': 208,
	'article-group-media': 124,
	'review-card-w': 260,
	'review-card-min-h': 224,
	'ratings-col': 168,
	'ratings-col-sm': 104,
	'map-h': 270,
	'hero-h': 360,
	'hero-h-lg': 468,
	'hero-overlap': 32,
	'hero-skeleton': 196,
	'cta-w': 144,
	'cta-w-lg': 188,
	'price-min-w': 92,
	'badge-w': 84,
	'choice-max-w': 128,
	'preference-min-w': 138,
	'search-pill': 64,
	'search-bar-w': 850,
	'search-bar-h': 66,
	qr: 160,
	'placeholder-sm': 64,
	'placeholder-md': 80,
	'placeholder-lg': 96,
	'placeholder-xl': 160,
	'scroll-max': 256,
	'day-card-min-w': 64
} as const satisfies Record<string, number>;

export const containers = {
	narrow: 360,
	text: 480,
	form: 560,
	dialog: 568,
	content: 760,
	listing: 1120,
	page: 1440,
	wide: 1920
} as const satisfies Record<string, number>;

export const breakpoints = {
	tablet: 744,
	split: 950,
	laptop: 1128,
	desktop: 1440,
	wide: 1920
} as const satisfies Record<string, number>;

export const icon = {
	xs: 12,
	sm: 16,
	md: 20,
	lg: 24,
	xl: 32
} as const satisfies Record<string, number>;

export const radius = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24
} as const satisfies Record<string, number>;

export const elevation = {
	raised: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.1)',
	overlay: '0 8px 24px rgba(15, 23, 42, 0.12)',
	floating: '0 6px 20px rgba(15, 23, 42, 0.18)',
	soft: '0 22px 54px rgba(15, 23, 42, 0.14)',
	bar: '0 -3px 12px rgba(15, 23, 42, 0.08)'
} as const satisfies Record<string, string>;

export const sheet = {
	sm: 60,
	md: 70,
	lg: 85,
	xl: 90
} as const satisfies Record<string, number>;

export const textScale = {
	max: 2
} as const satisfies Record<string, number>;
