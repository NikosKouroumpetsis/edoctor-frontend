import { vi } from 'vitest';

// Test stand-in for SvelteKit's `$app/navigation` virtual module: spies a spec can read (`vi.mocked(goto)`);
// `clearMocks` of the config resets their calls between tests.
export const goto = vi.fn(async () => {});
export const invalidate = vi.fn(async () => {});
export const invalidateAll = vi.fn(async () => {});
export const preloadData = vi.fn(async () => ({}));
export const preloadCode = vi.fn(async () => {});
export const beforeNavigate = vi.fn();
export const afterNavigate = vi.fn();
export const onNavigate = vi.fn();
export const pushState = vi.fn();
export const replaceState = vi.fn();
