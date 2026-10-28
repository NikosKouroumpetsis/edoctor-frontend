import { clsx, type ClassValue } from 'clsx';
import {
	extendTailwindMerge,
	type ConfigExtension,
	type DefaultClassGroupIds,
	type DefaultThemeGroupIds
} from 'tailwind-merge';
import { createTV, type TVConfig } from 'tailwind-variants';
import { icon, mergeTheme } from '$shared/design/tokens';

export type { VariantProps } from 'tailwind-variants';

type ClassGroupIds = DefaultClassGroupIds | 'glyph-size';

// One merge config for `cn` and `tv`: tailwind-variants keeps a single merger cache for the whole app.
// The `icon-*` utilities set width and height, so the later icon size (or `size-*`) wins over the earlier.
const twMergeConfig = {
	extend: {
		theme: mergeTheme,
		classGroups: { 'glyph-size': [{ icon: Object.keys(icon) }] },
		conflictingClassGroups: { 'glyph-size': ['size', 'w', 'h'], size: ['glyph-size'] }
	}
} satisfies ConfigExtension<ClassGroupIds, DefaultThemeGroupIds>;

const twMerge = extendTailwindMerge<'glyph-size'>(twMergeConfig);

// tailwind-variants types its config with the default group names only; the runtime takes ours as they are.
export const tv = createTV({ twMergeConfig: twMergeConfig as TVConfig['twMergeConfig'] });

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
