import type { ApiRequestBody, ApiResponseData } from '$shared/lib/api-client';

/** The account's profile as the server answers it (`GET /user/me`); `null` for an account with no profile yet. */
export type AccountProfileView = ApiResponseData<'getMyProfile', 200>;

/** A language the account's messages can be written in (`el`, `en`: the contract's `locale`). */
export type AccountLocale = NonNullable<ApiRequestBody<'updateMyProfile'>['locale']>;

/**
 * 🔴 U-169 / D-W45-06: ALL the page keeps of `GET /user/me` — the language of the account's emails and SMS, `null` when
 * the account names none or has no profile yet. Nothing else of the answer (a date of birth, a gender, a photo, an id)
 * ever leaves `api/` or reaches a cache.
 */
export type AccountLocaleFacts = { locale: AccountLocale | null };

/** A gender the contract knows (`MALE`, `FEMALE`, `NON_BINARY`, `OTHER_GENE`: the body's enum, never a list of ours). */
export type AccountGender = NonNullable<ApiRequestBody<'updateMyProfile'>['gender']>;

/**
 * Wave 4.5 · screen 58 («Προσωπικά στοιχεία»): what its two rows read of `GET /user/me` — the gender as the contract
 * spells it and the date of birth as a day (`YYYY-MM-DD`), each `null` when the account names none or has no profile
 * yet. 🔴 U-169: nothing else of the answer (a photo, a text, an id) leaves `api/` or reaches a cache.
 */
export type AccountPersonFacts = { gender: AccountGender | null; birthDate: string | null };

/** Why a write of the account's own profile was refused: the session (`401`), a value the server does not take, else. */
export type AccountWriteFailure = 'session' | 'birth-date' | 'invalid' | 'unknown';
