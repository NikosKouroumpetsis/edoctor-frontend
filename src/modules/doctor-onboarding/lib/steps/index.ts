import type {
	DoctorOnboardingProgress,
	DoctorOnboardingSection
} from '$modules/doctor-onboarding/api/progress';

/** The sign-up's steps in the prototype's order (`doctor.js` STEPS, the application's `DOCTOR_ONBOARDING_STEPS`). */
export const DOCTOR_ONBOARDING_STEPS = [
	'overview',
	'stage-1',
	'basic',
	'email',
	'email-code',
	'specialty',
	'stage-2',
	'location',
	'address-confirm',
	'pin',
	'office',
	'amenities',
	'payments',
	'price',
	'calendar',
	'stage-3',
	'terms',
	'access',
	'done'
] as const;

export type DoctorOnboardingStep = (typeof DOCTOR_ONBOARDING_STEPS)[number];

/** U-102: the screens a step opens and that return to it (`SUB` of the prototype): no step, no bar, no progress. */
export const DOCTOR_ONBOARDING_SUB_SCREENS = {
	'specialty-list': 'specialty',
	'address-search': 'location'
} as const satisfies Record<string, DoctorOnboardingStep>;

export type DoctorOnboardingSubScreen = keyof typeof DOCTOR_ONBOARDING_SUB_SCREENS;

/** Every page of the sign-up: a step, or a screen a step opens. */
export type DoctorOnboardingScreen = DoctorOnboardingStep | DoctorOnboardingSubScreen;

export type DoctorOnboardingStage = 0 | 1 | 2;

/** The sign-up's address, the application's route (`/doctor/onboarding`). */
export const DOCTOR_ONBOARDING_PATH = '/doctor/onboarding';

/**
 * 🔴 D-W3-28: every page's address under the sign-up, a CLOSED list — the application's routes (P-W3 Σ-1), so a link
 * opens the same screen in both; anything else is a 404.
 */
const SCREEN_PATHS = {
	overview: '',
	'stage-1': 'stage/1',
	basic: 'basic',
	email: 'email',
	'email-code': 'email/code',
	specialty: 'specialty',
	'specialty-list': 'specialty/list',
	'stage-2': 'stage/2',
	location: 'location',
	'address-search': 'location/search',
	'address-confirm': 'location/confirm',
	pin: 'location/pin',
	office: 'office',
	amenities: 'amenities',
	payments: 'payments',
	price: 'price',
	calendar: 'calendar',
	'stage-3': 'stage/3',
	terms: 'terms',
	access: 'access',
	done: 'done'
} as const satisfies Record<DoctorOnboardingScreen, string>;

const STAGE_STEPS: Record<DoctorOnboardingStage, readonly DoctorOnboardingStep[]> = {
	0: ['stage-1', 'basic', 'email', 'email-code', 'specialty'],
	1: [
		'stage-2',
		'location',
		'address-confirm',
		'pin',
		'office',
		'amenities',
		'payments',
		'price',
		'calendar'
	],
	2: ['stage-3', 'terms', 'access']
};

const EMAIL_STEPS: readonly DoctorOnboardingStep[] = ['email', 'email-code'];

/** Where each missing section is answered: «Συνέχεια» opens the first one (contract §3.6, `missing[0]`). */
const SECTION_STEPS: Record<DoctorOnboardingSection, DoctorOnboardingStep> = {
	BASIC_INFO: 'basic',
	CONTACT_EMAIL: 'email',
	PROFESSIONAL: 'specialty',
	OFFICE_ADDRESS: 'location',
	OFFICE_PHONE: 'office',
	OFFICE_PAYMENTS: 'payments',
	SERVICE_PRICING: 'price',
	CALENDAR: 'calendar',
	LIABILITY: 'terms',
	TERMS: 'terms',
	ACTIVATION_INTENT: 'access'
};

/** The address of `screen` (without the language): `/doctor/onboarding`, `/doctor/onboarding/location/pin` … */
export function doctorOnboardingPath(screen: DoctorOnboardingScreen): string {
	const rest = SCREEN_PATHS[screen];
	return rest ? `${DOCTOR_ONBOARDING_PATH}/${rest}` : DOCTOR_ONBOARDING_PATH;
}

/**
 * 🔴 D-W3-28, U-65.6: the page a route's rest (`[...step]`) names, from the closed list only; `undefined` for anything
 * else (a guess, a path out, a step one level too deep), which is the route's 404.
 */
export function readDoctorOnboardingScreen(
	rest: string | null | undefined
): DoctorOnboardingScreen | undefined {
	const value = rest ?? '';
	return (Object.keys(SCREEN_PATHS) as DoctorOnboardingScreen[]).find(
		(screen) => SCREEN_PATHS[screen] === value
	);
}

/** Whether `screen` is a screen a step opens (the specialties' list, the address search). */
export function isDoctorOnboardingSubScreen(
	screen: DoctorOnboardingScreen
): screen is DoctorOnboardingSubScreen {
	return Object.hasOwn(DOCTOR_ONBOARDING_SUB_SCREENS, screen);
}

/** The step a screen belongs to: itself, or the step that opens it. */
export function doctorOnboardingStepOf(screen: DoctorOnboardingScreen): DoctorOnboardingStep {
	return isDoctorOnboardingSubScreen(screen) ? DOCTOR_ONBOARDING_SUB_SCREENS[screen] : screen;
}

/** Record §6.4: the contact email is asked only when the account has none verified (`CONTACT_EMAIL` missing). */
export function needsContactEmail(progress: Pick<DoctorOnboardingProgress, 'missing'> | undefined) {
	return progress?.missing.includes('CONTACT_EMAIL') ?? false;
}

/** The steps this account walks: the two email screens only while its contact email is missing. */
function sequenceOf(needsEmail: boolean): DoctorOnboardingStep[] {
	return DOCTOR_ONBOARDING_STEPS.filter((step) => needsEmail || !EMAIL_STEPS.includes(step));
}

/** The stage a step belongs to, or `null` for the overview and the end, which carry no bar. */
export function readDoctorOnboardingStage(
	step: DoctorOnboardingStep
): DoctorOnboardingStage | null {
	return ([0, 1, 2] as const).find((stage) => STAGE_STEPS[stage].includes(step)) ?? null;
}

/**
 * The bar under a step (the prototype's `bar()`): its stage, and how far into it this step is — its place over the
 * stage's length, counting the two email screens only for an account asked them (record §6.3: the segments before
 * full, this one partly, the ones after empty).
 */
export function readDoctorOnboardingFill(
	step: DoctorOnboardingStep,
	needsEmail: boolean
): { stage: DoctorOnboardingStage; fill: number } | null {
	const stage = readDoctorOnboardingStage(step);
	if (stage === null) return null;
	const inStage = STAGE_STEPS[stage].filter(
		(candidate) => needsEmail || EMAIL_STEPS.includes(step) || !EMAIL_STEPS.includes(candidate)
	);
	return { stage, fill: (inStage.indexOf(step) + 1) / inStage.length };
}

/** The step after `step` for this account; `done` after the last. */
export function nextDoctorOnboardingStep(
	step: DoctorOnboardingStep,
	needsEmail: boolean
): DoctorOnboardingStep {
	const sequence = sequenceOf(needsEmail || EMAIL_STEPS.includes(step));
	return sequence[sequence.indexOf(step) + 1] ?? 'done';
}

/** The step before `step` for this account: where «Πίσω» lands on a page opened with no history (a link, a reload). */
export function previousDoctorOnboardingStep(
	step: DoctorOnboardingStep,
	needsEmail: boolean
): DoctorOnboardingStep {
	const sequence = sequenceOf(needsEmail || EMAIL_STEPS.includes(step));
	return sequence[sequence.indexOf(step) - 1] ?? 'overview';
}

/** Where «Συνέχεια» resumes a sign-up (P-B3 Σ-24, one rule in app and web): the first missing section's screen. */
export function resumeDoctorOnboardingStep(
	progress: Pick<DoctorOnboardingProgress, 'missing'>
): DoctorOnboardingStep {
	const [first] = progress.missing;
	return first ? SECTION_STEPS[first] : 'access';
}

/**
 * The last page that answers each section: the email's code, the address's pin (its two screens before it write
 * nothing), the terms with the insurance. A page up to it may be open while the section is still missing.
 */
const SECTION_LAST_STEPS: Record<DoctorOnboardingSection, DoctorOnboardingStep> = {
	...SECTION_STEPS,
	CONTACT_EMAIL: 'email-code',
	OFFICE_ADDRESS: 'pin'
};

/**
 * P-W3 §3.3.3: a page opened straight from a link lies beyond what the server holds — after the last page of the first
 * section still missing. Its writes would need the earlier ones, so the first missing step opens instead. The overview
 * and the end are never beyond; nothing missing is never beyond.
 */
export function isDoctorOnboardingBeyondProgress(
	screen: DoctorOnboardingScreen,
	progress: Pick<DoctorOnboardingProgress, 'missing'>
): boolean {
	const step = doctorOnboardingStepOf(screen);
	const [first] = progress.missing;
	if (step === 'overview' || step === 'done' || !first) return false;
	const order = DOCTOR_ONBOARDING_STEPS as readonly DoctorOnboardingStep[];
	return order.indexOf(step) > order.indexOf(SECTION_LAST_STEPS[first]);
}
