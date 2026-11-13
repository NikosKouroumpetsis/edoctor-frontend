import { m } from '$paraglide/messages.js';
import { formatDecimal } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DeletionChannel,
	DeletionFailureKind,
	DeletionPreviewFacts
} from '$modules/account/api/deletion';

type MessageOptions = { locale: SupportedLocale };
type Words = (options: MessageOptions) => string;

/** One line of the preview: its words, a count beside them (`meta` alone), or why and for how long under them. */
export type DeletionLine = { id: string; text: string; meta: string | null; detail: string | null };

/** The preview as the page prints it (the application's `ProfileAccountDeletionPreviewContent`). */
export type DeletionPreview = {
	/** Why the account cannot be deleted from here; then there is NO way on. */
	refusal: string | null;
	removed: DeletionLine[];
	warnings: DeletionLine[];
	retained: DeletionLine[];
	/** «Για να βεβαιωθούμε ότι είστε εσείς, θα στείλουμε κωδικό στο …» — only for an account that may be deleted. */
	codeNotice: string | null;
};

/** Which call was refused: the code's send (`start`) or the deletion itself (`confirm`). */
export type DeletionStep = 'send' | 'confirm';

// 🔴 U-173 (D-W45-31): one word everywhere — «κριτικές», never «αξιολογήσεις», in every line a reader meets here.
const REMOVED: Record<string, Words> = {
	appointmentsCanceled: (o) => m.profile_account_deletion_removed_appointments_canceled({}, o),
	articleAuthorships: (o) => m.profile_account_deletion_removed_article_authorships({}, o),
	calendarConnections: (o) => m.profile_account_deletion_removed_calendar_connections({}, o),
	conversations: (o) => m.profile_account_deletion_removed_conversations({}, o),
	doctorAnswers: (o) => m.profile_account_deletion_removed_doctor_answers({}, o),
	doctorAppointmentsCanceled: (o) =>
		m.profile_account_deletion_removed_doctor_appointments_canceled({}, o),
	doctorProfiles: (o) => m.profile_account_deletion_removed_doctor_profiles({}, o),
	doctorRatingInvitationsRevoked: (o) =>
		m.profile_account_deletion_removed_doctor_rating_invitations_revoked({}, o),
	erpItems: (o) => m.profile_account_deletion_removed_erp_items({}, o),
	erpTraders: (o) => m.profile_account_deletion_removed_erp_traders({}, o),
	favoriteDoctors: (o) => m.profile_account_deletion_removed_favorite_doctors({}, o),
	legalAcceptances: (o) => m.profile_account_deletion_removed_legal_acceptances({}, o),
	legalNotices: (o) => m.profile_account_deletion_removed_legal_notices({}, o),
	// Wave 4.5 · screen 63 (D-W45-47): the lines of the account's notification list go with it.
	notificationInboxItems: (o) => m.profile_account_deletion_removed_notification_inbox_items({}, o),
	notificationPreferences: (o) =>
		m.profile_account_deletion_removed_notification_preferences({}, o),
	notificationsCanceled: (o) => m.profile_account_deletion_removed_notifications_canceled({}, o),
	offices: (o) => m.profile_account_deletion_removed_offices({}, o),
	operationsAlerts: (o) => m.profile_account_deletion_removed_operations_alerts({}, o),
	patientProfiles: (o) => m.profile_account_deletion_removed_patient_profiles({}, o),
	pendingTransmissions: (o) => m.profile_account_deletion_removed_pending_transmissions({}, o),
	profiles: (o) => m.profile_account_deletion_removed_profiles({}, o),
	providerMessageTemplates: (o) =>
		m.profile_account_deletion_removed_provider_message_templates({}, o),
	pushDevices: (o) => m.profile_account_deletion_removed_push_devices({}, o),
	questions: (o) => m.profile_account_deletion_removed_questions({}, o),
	ratingInvitationsRevoked: (o) =>
		m.profile_account_deletion_removed_rating_invitations_revoked({}, o),
	ratings: (o) => m.profile_account_deletion_removed_ratings({}, o),
	receivedRatings: (o) => m.profile_account_deletion_removed_received_ratings({}, o),
	relatives: (o) => m.profile_account_deletion_removed_relatives({}, o),
	trackingConsents: (o) => m.profile_account_deletion_removed_tracking_consents({}, o)
};

const WARNINGS: Record<string, Words> = {
	APPOINTMENTS_IN_PROGRESS: (o) =>
		m.profile_account_deletion_warning_appointments_in_progress({}, o),
	FAILED_TRANSMISSIONS: (o) => m.profile_account_deletion_warning_failed_transmissions({}, o),
	LICENSE_LOST: (o) => m.profile_account_deletion_warning_license_lost({}, o),
	MESSAGES_COPY_BEFORE_DELETION: (o) =>
		m.profile_account_deletion_warning_messages_copy_before_deletion({}, o),
	RECORD_COPY_ON_REQUEST: (o) => m.profile_account_deletion_warning_record_copy_on_request({}, o),
	SMS_UNITS_LOST: (o) => m.profile_account_deletion_warning_sms_units_lost({}, o)
};

const REFUSALS: Record<string, Words> = {
	BACKOFFICE_ACCOUNT: (o) => m.profile_account_deletion_refusal_backoffice({}, o),
	NO_VERIFIED_CHANNEL: (o) => m.profile_account_deletion_refusal_no_verified_channel({}, o)
};

const CATEGORIES: Record<string, Words> = {
	ABUSE_MEASURE: (o) => m.profile_account_deletion_retained_category_abuse_measure({}, o),
	DELETION_TRACE: (o) => m.profile_account_deletion_retained_category_deletion_trace({}, o),
	DOCTOR_APPOINTMENT_BOOK: (o) =>
		m.profile_account_deletion_retained_category_doctor_appointment_book({}, o),
	DOCTOR_PATIENT_RECORD: (o) =>
		m.profile_account_deletion_retained_category_doctor_patient_record({}, o),
	DOCTOR_TAX_RECORDS: (o) => m.profile_account_deletion_retained_category_doctor_tax_records({}, o),
	LEGAL_ACCEPTANCE: (o) => m.profile_account_deletion_retained_category_legal_acceptance({}, o),
	MESSAGE_REPORT: (o) => m.profile_account_deletion_retained_category_message_report({}, o),
	PLATFORM_ACCOUNTING: (o) =>
		m.profile_account_deletion_retained_category_platform_accounting({}, o),
	RATING_MODERATION: (o) => m.profile_account_deletion_retained_category_rating_moderation({}, o)
};

const PURPOSES: Record<string, Words> = {
	ABUSE_PREVENTION: (o) => m.profile_account_deletion_retained_purpose_abuse_prevention({}, o),
	ACCOUNTING_RETENTION: (o) =>
		m.profile_account_deletion_retained_purpose_accounting_retention({}, o),
	DELETION_ACCOUNTABILITY: (o) =>
		m.profile_account_deletion_retained_purpose_deletion_accountability({}, o),
	DOCTOR_RECORD_KEEPING: (o) =>
		m.profile_account_deletion_retained_purpose_doctor_record_keeping({}, o),
	LEGAL_CLAIMS_EVIDENCE: (o) =>
		m.profile_account_deletion_retained_purpose_legal_claims_evidence({}, o),
	MODERATION_EVIDENCE: (o) =>
		m.profile_account_deletion_retained_purpose_moderation_evidence({}, o),
	TAX_LAW_RETENTION: (o) => m.profile_account_deletion_retained_purpose_tax_law_retention({}, o)
};

/** A code through its table of words, or `null` for one newer than this build knows (never a key of the prototype's). */
const wordsOf = (table: Record<string, Words>, code: string): Words | null =>
	Object.hasOwn(table, code) ? table[code] : null;

/** Where the code goes: the masked address the server published, or its channel when none came with it. */
export function deletionDestination(
	masked: string | null,
	channel: DeletionChannel | null,
	locale: SupportedLocale
): string {
	if (masked) return masked;
	return channel === 'phone'
		? m.profile_account_deletion_destination_phone({}, { locale })
		: m.profile_account_deletion_destination_email({}, { locale });
}

/**
 * What the account loses, in the server's order with its counts by the one number rule (S-31.2), after the sign-in
 * details every account loses. A kind that removes nothing is not listed; kinds this build has no words for are
 * summed into ONE line rather than hidden.
 */
function removedLines(facts: DeletionPreviewFacts, locale: SupportedLocale): DeletionLine[] {
	const options = { locale };
	const lines: DeletionLine[] = [
		{
			id: 'account',
			text: m.profile_account_deletion_removed_account({}, options),
			meta: null,
			detail: null
		}
	];
	let unnamed = 0;
	for (const { item, count } of facts.removed) {
		if (count <= 0) continue;
		const words = wordsOf(REMOVED, item);
		if (!words) {
			unnamed += count;
			continue;
		}
		lines.push({
			id: item,
			text: words(options),
			meta: formatDecimal(count, locale, 0),
			detail: null
		});
	}
	if (unnamed > 0) {
		lines.push({
			id: 'other',
			text: m.profile_account_deletion_removed_other({}, options),
			meta: formatDecimal(unnamed, locale, 0),
			detail: null
		});
	}
	return lines;
}

/** What stays: WHAT it is, WHY it is kept and for HOW LONG at most — each from the server's code, never inferred. */
function retainedLines(facts: DeletionPreviewFacts, locale: SupportedLocale): DeletionLine[] {
	const options = { locale };
	return facts.retained.map(({ category, purpose, maxRetentionYears }) => ({
		id: category,
		text: (
			wordsOf(CATEGORIES, category) ??
			((o) => m.profile_account_deletion_retained_category_unknown({}, o))
		)(options),
		detail: (
			wordsOf(PURPOSES, purpose) ??
			((o) => m.profile_account_deletion_retained_purpose_unknown({}, o))
		)(options),
		meta:
			maxRetentionYears === 1
				? m.profile_account_deletion_retained_years_one({}, options)
				: m.profile_account_deletion_retained_years_other({ years: maxRetentionYears }, options)
	}));
}

/**
 * The preview the server answered, as the page prints it (the application's `buildAccountDeletionPreviewContent`). A
 * refused account reads its reason and has NO way on; an allowed one is told where the code will go.
 */
export function buildDeletionPreview(
	facts: DeletionPreviewFacts,
	locale: SupportedLocale
): DeletionPreview {
	const options = { locale };
	const refusal =
		(facts.refusal ? wordsOf(REFUSALS, facts.refusal) : null) ??
		((o: MessageOptions) => m.profile_account_deletion_refusal_unknown({}, o));
	return {
		refusal: facts.allowed ? null : refusal(options),
		removed: removedLines(facts, locale),
		warnings: facts.warnings.map((warning) => ({
			id: warning,
			text: (
				wordsOf(WARNINGS, warning) ?? ((o) => m.profile_account_deletion_warning_unknown({}, o))
			)(options),
			meta: null,
			detail: null
		})),
		retained: retainedLines(facts, locale),
		codeNotice: facts.allowed
			? m.profile_account_deletion_code_notice(
					{
						destination: deletionDestination(facts.codeDestinationMasked, facts.codeChannel, locale)
					},
					options
				)
			: null
	};
}

const FAILURES: Record<DeletionFailureKind, Words> = {
	backoffice: (o) => m.profile_account_deletion_refusal_backoffice({}, o),
	'invalid-code': (o) => m.profile_account_deletion_errors_invalid_code({}, o),
	locked: (o) => m.profile_account_deletion_errors_locked({}, o),
	'no-channel': (o) => m.profile_account_deletion_refusal_no_verified_channel({}, o),
	'rate-limited': (o) => m.profile_account_deletion_errors_rate_limited({}, o),
	'session-ended': (o) => m.profile_account_deletion_errors_unknown({}, o),
	'stale-code': (o) => m.profile_account_deletion_errors_stale_code({}, o),
	unknown: (o) => m.profile_account_deletion_errors_unknown({}, o),
	unreachable: (o) => m.profile_account_deletion_errors_unreachable({}, o)
};

/**
 * The sentence for a refused call (the application's `buildAccountDeletionFailureMessage`). A CONFIRM with no answer
 * the page can read is not «no connection»: the server may already have deleted the account, so the reader is told so
 * and asked to press again. A throttled send means too many codes; a throttled confirm, too many attempts.
 */
export function deletionFailureMessage(
	kind: DeletionFailureKind,
	step: DeletionStep,
	locale: SupportedLocale
): string {
	const options = { locale };
	if (step === 'confirm' && (kind === 'unreachable' || kind === 'unknown')) {
		return m.profile_account_deletion_errors_unanswered({}, options);
	}
	if (step === 'confirm' && kind === 'rate-limited') {
		return m.profile_account_deletion_errors_too_many_attempts({}, options);
	}
	return FAILURES[kind](options);
}

/** «Μπορείτε να ζητήσετε νέο κωδικό σε 1 δευτερόλεπτο / N δευτερόλεπτα.»: the cooldown left, singular only for one. */
export function deletionResendWait(seconds: number, locale: SupportedLocale): string {
	return seconds === 1
		? m.profile_account_deletion_code_resend_wait_one({}, { locale })
		: m.profile_account_deletion_code_resend_wait_other({ seconds }, { locale });
}

/** The code as its field keeps it: digits only, six at most — whatever was typed or pasted (U-65.6). */
export const DELETION_CODE_LENGTH = 6;
export function cleanDeletionCode(typed: string): string {
	return typed.replace(/\D/gu, '').slice(0, DELETION_CODE_LENGTH);
}
