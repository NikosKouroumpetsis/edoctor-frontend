import type { ResolvedPathname } from '$app/types';
import type { AuthFlowState } from './hooks/flow-state.svelte';

/** The steps of the sign-in, the application's (`app/auth/**`, `app/onboarding`): one component each. */
export type AuthStep =
	| 'entry'
	| 'welcome'
	| 'otp'
	| 'password'
	| 'register'
	| 'set-password'
	| 'set-password-code'
	| 'set-password-new'
	| 'onboarding';

/** A step on the stage: settled, or on its way in or out (the CSS moves it, U-12). */
export type AuthStepPhase = 'still' | 'in-forward' | 'out-forward' | 'in-back' | 'out-back';

export type AuthStepFrame = { id: number; step: AuthStep; phase: AuthStepPhase };

/** The small surfaces over a step: a sheet below 744, a panel in the window from 744. */
export type AuthSubSurface = 'country' | 'options' | 'date' | 'gender';

export type AuthResendFeedback = { kind: 'wait' | 'sent'; message: string };

export type AuthFlowProps = {
	flow: AuthFlowState;
	locale: 'el' | 'en';
	/** The id the surface's `aria-labelledby` points at. */
	titleId?: string;
	privacyHref: ResolvedPathname;
	termsHref: ResolvedPathname;
	deletionHref: ResolvedPathname;
	/** «×». */
	onClose: () => void;
	/** The end of a journey that stayed open after the sign-in («Όχι τώρα», a saved password). */
	onLeaveAfterSignIn: () => void;
	/** The height the step asks of the window from 744 (Ε1), measured. */
	onWindowHeight?: (height: number) => void;
};
