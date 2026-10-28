/**
 * The kit's motion is CSS (U-12.2): `starting:` brings a layer in, `data-[state=closed]:` takes it out and
 * `transition-[…]` on the `duration-<name>` / `ease-<name>` of the `motion` tokens moves it, whatever the device's
 * motion setting (U-12.1). The JS only keeps a leaving layer in the DOM until its own transitions end (`Presence`,
 * `presence.svelte.ts`); these are its clocks.
 */
import { motion, type MotionDuration } from '$shared/design/tokens';

/** How long a leave may outlast its token before the layer goes anyway (a transition that never reports its end). */
export const LEAVE_GRACE_MS = 50;

/** The safety clock of a leave: the token's duration and the grace. */
export function leaveTimeout(name: MotionDuration): number {
	return motion.duration[name] + LEAVE_GRACE_MS;
}

/**
 * Whether CSS still moves the node itself: one of its own transitions runs. Reading the animations brings the
 * node's style up to date first, so a leave that has just been asked for counts. A browser (or jsdom) that reports
 * no animations moves nothing.
 */
export function isMoving(node: Element): boolean {
	if (typeof node.getAnimations !== 'function') return false;
	return node
		.getAnimations()
		.some((animation) => animation.playState === 'running' && 'transitionProperty' in animation);
}
