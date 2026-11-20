import type {
	ApiResponseData,
	DoctorPublicMarketplaceProfileResponseView
} from '$shared/lib/api-client';

/** `GET /doctor/me/profile` as the contract writes it (D-W52-17); it stays inside `api/`. */
export type DoctorMyProfileView = ApiResponseData<'getDoctorMyProfile', 200>;

/** Why the search does not show the doctor, the contract's own enum (`DoctorProfileHiddenReason`). */
export type DoctorProfileHiddenReason = NonNullable<DoctorMyProfileView['visibility']['reason']>;

/** A helper of the readiness still open, the contract's own enum (`DoctorMyProfileMissingCode`). */
export type DoctorProfileMissingCode = DoctorMyProfileView['missing'][number];

/**
 * FACTS of «Το προφίλ μου» (D-W52-17, screen 77), as the server answers them for the session's own doctor: whether the
 * search shows the doctor and the one reason if not, what each of the six sections holds — counts, names of the
 * catalogue — and the helpers still open. Never an email, a phone, an AMKA or a tax number (the server sends none).
 */
export type DoctorMyProfileFacts = {
	doctorId: string;
	/** The public page's slug in the page's language; `null` while the doctor has none. */
	slug: string | null;
	visibility: {
		visible: boolean;
		reason: DoctorProfileHiddenReason | null;
		/** The end of the marketplace licence that ended: only with `LICENCE_EXPIRED`. */
		licenceEndedAt: string | null;
	};
	sections: {
		photos: { count: number };
		/** 🔴 D-W52-47: `nameLocked` — the first licence locked the name (screen 79 says so under it). */
		about: { fullName: string | null; hasDescription: boolean; nameLocked: boolean };
		/**
		 * 🔴 D-W52-57 / 59: `hasCatalogue` — the specialty has a list of specializations to pick from (without one the
		 * pages show none at all); `specializationsCount` — the doctor's picks in any status, 0 without a list.
		 */
		specialty: { name: string | null; specializationsCount: number; hasCatalogue: boolean };
		cv: { studies: number; positions: number; conferences: number };
		languages: { names: string[]; socialCount: number };
		services: { count: number; minPrice: number | null; samePrice: boolean };
	};
	missing: DoctorProfileMissingCode[];
};

/**
 * `GET /doctor/me/profile/preview` as the contract writes it (D-W52-18, U-224): the public profile's own answer, read for
 * the doctor of the session. The screen hands the reader of that answer in (the `doctor` module's, a module never
 * imports another); this name is how the reader's argument is typed outside `api/`.
 */
export type DoctorProfilePreviewAnswer = DoctorPublicMarketplaceProfileResponseView;

/** `GET /doctor/profile/translations/{language}` as the contract writes it (D-W52-47); it stays inside `api/`. */
export type DoctorProfileTextView = ApiResponseData<'getDoctorProfileTranslation', 200>;

/**
 * FACTS of «Όνομα και περιγραφή» (D-W52-48, screen 79): the public page's Greek name and its description as the
 * paragraphs a patient reads — plain text, made by the public page's own reader (the screen hands it in). Nothing else
 * of the answer is kept (no id, no slug, no list of the biography).
 */
export type DoctorProfileTextFacts = { fullName: string | null; paragraphs: string[] };

/** The public page's reader of a description: the server's document ⇒ its paragraphs as plain text. */
export type DoctorDescriptionReader = (document: unknown) => readonly string[];

/** `GET /doctor/profile/base` as the contract writes it (screen 80 reads the practice licence of it); it stays inside `api/`. */
export type DoctorProfileBaseView = ApiResponseData<'getDoctorProfileBase', 200>;

/**
 * FACTS of «Άδεια ασκήσεως» (D-W52-59, screen 80): the licence's number as plain text and the day it was obtained as a
 * calendar day (`2010-03-12`), each `null` when the doctor's record has none. Nothing else of the base profile is kept
 * (no email, no phone, no policy of the bookings).
 */
export type DoctorPracticeLicenceFacts = { number: string | null; obtainedDay: string | null };

/** What the preview's read keeps: the page's facts as the screen's reader made them (`null`: no page to draw), and when. */
export type DoctorProfilePreviewRead<Profile> = { profile: Profile | null; readAt: number };
