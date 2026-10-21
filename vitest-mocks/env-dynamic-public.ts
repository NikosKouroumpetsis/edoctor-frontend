// Stand-in for SvelteKit's `$env/dynamic/public` virtual module, aliased by Vitest and
// Storybook. Tests set and delete `PUBLIC_*` keys on this object.
export const env: Record<`PUBLIC_${string}`, string | undefined> = {};
