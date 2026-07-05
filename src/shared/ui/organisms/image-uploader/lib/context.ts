/**
 * Shared context for the `image-uploader` organism.
 *
 * Mirrors the `selectable-cards` pattern: the orchestrator root calls
 * `setImageUploaderContext(controller)` and every sub-part reads it through
 * `getImageUploaderContext()`. Keyed by a unique `Symbol`, so it never
 * collides with other primitives' contexts.
 */
import { createContext } from '$shared/lib/headless';
import type { ImageUploaderContext } from './types';

export const [getImageUploaderContext, setImageUploaderContext] =
	createContext<ImageUploaderContext>('ImageUploader');
