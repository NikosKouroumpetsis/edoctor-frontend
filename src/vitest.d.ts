import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Make the jest-dom matchers (toBeInTheDocument, toHaveValue, …) visible to
// `svelte-check`/`tsc`, not just to the Vitest runtime. The actual matcher
// registration happens in `vitest-setup-client.ts`.
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
declare module 'vitest' {
	interface Assertion<T = any> extends TestingLibraryMatchers<unknown, T> {}
	interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
