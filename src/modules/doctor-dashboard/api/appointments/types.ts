import type {
	ApiRequestBody,
	AppointmentConfirmationMode,
	AppointmentStatus
} from '$shared/lib/api-client';
import type { OfficeAddress } from '$shared/lib/office';

export type { AppointmentStatus };

/** The doctor's answers of a visit that began (`POST …/outcome`), the contract's enum. */
export type DoctorAppointmentOutcome = ApiRequestBody<'declareAppointmentOutcome'>['outcome'];

/** The two answers that settle a visit: «Δεν ήρθε» and «Ολοκληρώθηκε» (`ARRIVED` only checks it in). */
export type DoctorAppointmentVerdict = Extract<DoctorAppointmentOutcome, 'NO_SHOW' | 'COMPLETED'>;

/**
 * 🔴 D-W51-40 · U-196.1: the one correction the server opens on a settled visit — the opposite verdict and until when
 * (the system's answer or the doctor's own, until 48 hours after the end); `null` for none.
 */
export type DoctorOutcomeCorrection = { to: DoctorAppointmentVerdict; until: string };

/** Who wrote a settled visit's outcome (`outcomeSource`): the doctor (or the backoffice for him), or the system at 24 h. */
export type DoctorOutcomeSource = 'DOCTOR' | 'SYSTEM';

/** 🔴 D-W51-47: why a request is refused (`POST …/reject`), the contract's enum. */
export type DoctorRejectReasonCode = ApiRequestBody<'rejectAppointment'>['reasonCode'];

/**
 * 🔴 D-W51-47 (D-20): why the doctor side cancels (`POST …/cancel`): the contract's enum less the patient's own five —
 * a code the contract adds is the doctor's until said otherwise, so its words are asked for by the build.
 */
export type DoctorCancelReasonCode = Exclude<
	ApiRequestBody<'cancelAppointment'>['reasonCode'],
	'SCHEDULE_CONFLICT' | 'FEELING_BETTER' | 'FOUND_ANOTHER_DOCTOR' | 'PERSONAL'
>;

/** 🔴 Screen 69: the refusal of a request — its reason, and the words to the patient only when there are some. */
export type DoctorRejectRequest = { reasonCode: DoctorRejectReasonCode; message?: string };

/** 🔴 Screen 69: the cancellation by the doctor — its reason, and the words to the patient only when there are some. */
export type DoctorCancelRequest = { reasonCode: DoctorCancelReasonCode; reasonText?: string };

/** Who acted on an appointment, as the contract names the sides (`AppointmentActorKind`). */
export type DoctorAppointmentActor = 'DOCTOR' | 'BACKOFFICE' | 'PATIENT' | 'SYSTEM';

/**
 * 🔴 D-W51-53 / D-W51-71: whose appointment it is — an account of eDoctor (`ACCOUNT`, every one before step 8), or the
 * doctor's own record of a patient without one (`RECORD`: «Χωρίς λογαριασμό eDoctor», no «Μήνυμα»).
 */
export type DoctorPatientKind = 'ACCOUNT' | 'RECORD';

/**
 * 🔴 D-W51-21 (D-118: «ο server αποφασίζει»): what the doctor may do with ONE appointment NOW, as the server said it on
 * the list's row — a flag only when it is `true`, the outcomes only as the contract's words. A row without `actions`
 * (an older server, the patient's side) offers nothing.
 */
export type DoctorAppointmentActions = {
	canConfirm: boolean;
	canReject: boolean;
	canReschedule: boolean;
	canCancel: boolean;
	/** 🔴 D-W51-44: «Υπηρεσίες και κόστος» (the doctor side's editable states: a request, a kept visit, one at the office). */
	canEditCharges: boolean;
	outcomes: DoctorAppointmentOutcome[];
	/** 🔴 D-W51-61 / 62: «Διόρθωση» (screen 71) — only while the server opens it, never computed here. */
	correction: DoctorOutcomeCorrection | null;
};

/**
 * One appointment as the doctor's «Σήμερα» reads it (D-W51-22), FACTS only: its state and hours on the office's clock,
 * the request's deadline and the instant the system writes «Ολοκληρώθηκε» (D-W51-21), who comes — the person as booked,
 * the relative when it is for one — their note, the service and the office as frozen (D-06), who canceled, and the
 * server's `actions`. 🔴 U-182.7 lets the doctor read the patient whole; this page needs only the names, so no phone,
 * email, ΑΜΚΑ or ΑΦΜ is kept here (D-W51-06: nothing kept that no page shows). Absence is `null`.
 */
export type DoctorAppointmentFacts = {
	id: string;
	status: AppointmentStatus;
	startTime: string;
	endTime: string | null;
	officeTimeZone: string;
	expiresAt: string | null;
	unattendedOutcomeAt: string | null;
	/** 🔴 D-W51-71: an account's appointment, or one of the doctor's record of a patient without one. */
	patientKind: DoctorPatientKind;
	/** The account holder as booked (the one who arranged it when the visit is for a relative). */
	patientName: string | null;
	/** The relative the visit is for, as frozen; the relationship as the server spells it (`''` when absent). */
	relative: { name: string | null; relationship: string } | null;
	patientNote: string | null;
	service: { title: string; durationInMinutes: number | null } | null;
	/** The office's street and number as booked, and in each language it kept (`lib/` picks the page's). */
	office: { line: string | null; translated: { language: string; line: string }[] } | null;
	canceledBy: DoctorAppointmentActor | null;
	/** 🔴 D-W51-29: who refused a `rejected` one («Απορρίφθηκε από εσάς» when it was the doctor). */
	rejectedBy: DoctorAppointmentActor | null;
	actions: DoctorAppointmentActions;
};

/** One page of the doctor's side of the list: the rows the page can name, the cursor, the count. */
export type DoctorAppointmentPageFacts = {
	items: DoctorAppointmentFacts[];
	nextCursor: string | null;
	total: number;
};

/**
 * 🔴 D-W51-22: a read to the end of the server's pages; `complete` is false when the pages did not end within the reads
 * allowed — what was read is shown, never said to be the whole.
 */
export type DoctorAppointmentScanFacts = { items: DoctorAppointmentFacts[]; complete: boolean };

/**
 * What one read of the doctor's side names (`as=doctor` always): the requests (`status=pending`), a window of the
 * server's clock (`from` / `to`, on `startTime`, both ends kept), or one of the server's own tabs (`scope`: «today»,
 * «from tomorrow», the history — D-118, the bounds are its clock's).
 */
export type DoctorAppointmentListFilter =
	| { status: 'pending' }
	| { from: string; to: string }
	| { scope: 'today' | 'upcoming' | 'history' };

/**
 * One page of that read: the filter, the page's size and cursor, the order (oldest first unless `desc`: screen 67's
 * history, D-W51-29) and the office (screen 67's filter, D-W51-29; none for every office).
 */
export type DoctorAppointmentListRequest = DoctorAppointmentListFilter & {
	limit: number;
	cursor?: string;
	sortDir?: 'asc' | 'desc';
	officeId?: string;
};

/**
 * 🔴 Why a one-tap answer was refused, as facts for the page: the session ended (`401`), the appointment moved under
 * the page (`409`: answered, expired or settled meanwhile), the server would not (`403` / `404`: not this doctor's, the
 * licence), or nobody decided (a lost request, an outage, `429`, `5xx`).
 */
export type DoctorActionFailureFacts = {
	kind: 'session' | 'conflict' | 'refused' | 'unknown';
	status: number;
};

/**
 * 🔴 U-182.7: a person of the appointment as the doctor reads them WHOLE — the name as booked, the mobile, the email, the
 * ΑΜΚΑ and the ΑΦΜ (the doctor side of the detail carries them, D-W45-11). Absence is `null`. Only screen 68 reads these:
 * the list's facts keep the names alone (D-W51-06).
 */
export type DoctorAppointmentPerson = {
	name: string | null;
	phone: string | null;
	email: string | null;
	amka: string | null;
	afm: string | null;
};

/** The relative the visit was booked for, as frozen (D-06): the person, the relationship and the gender as spelled. */
export type DoctorAppointmentRelative = DoctorAppointmentPerson & {
	relationship: string;
	gender: string;
};

/**
 * One service line as booked (a line removed stays, `isActive: false`): its title, length and gross amount, and since
 * screen 70 (D-W51-52) the doctor's service it is of and how many — what «Υπηρεσίες και κόστος» starts from.
 */
export type DoctorAppointmentServiceLine = {
	title: string;
	durationInMinutes: number | null;
	amount: number | null;
	isActive: boolean;
	/** The doctor's service (a server id), `null` when the answer names none. */
	doctorServiceId: string | null;
	quantity: number;
};

/** The office as frozen: its address parts, floor and languages (the shared `OfficeAddress`). */
export type DoctorAppointmentOffice = OfficeAddress;

/**
 * One line of the appointment's trail (D-W51-38, «Χρονολόγιο»): what happened, who did it (`null` when the reader may
 * not learn it), when, the state it led to, and the hours of a move.
 */
export type DoctorAppointmentAuditLine = {
	action: string;
	actorKind: DoctorAppointmentActor | null;
	at: string;
	status: AppointmentStatus | null;
	previousStartTime: string | null;
	nextStartTime: string | null;
};

/**
 * 🔴 Screen 68 «Το ραντεβού» (D-W51-33, D-W51-38): ONE appointment as the doctor's page reads it — its state and hours
 * on the office's clock, the request's deadline and the system's outcome, how it is confirmed, who comes (the patient,
 * the relative) WHOLE (U-182.7), their note, the services and the cost, the office, how it ended (who, when, the
 * reason, the words), the server's `actions`, its trail, and the three keys of the doctor side: the visits before this
 * one, the patient's cancellation terms and the conversation with the account. Absence is `null`.
 */
export type DoctorAppointmentDetailFacts = {
	id: string;
	status: AppointmentStatus;
	startTime: string;
	/** 🔴 D-W51-61: the visit's end as the server keeps it — «σε εξέλιξη» until then, «Τι έγινε με την επίσκεψη;» after. */
	endTime: string | null;
	durationInMinutes: number | null;
	officeTimeZone: string;
	expiresAt: string | null;
	unattendedOutcomeAt: string | null;
	/** 🔴 D-W51-61 / 62: who wrote the outcome, when, and until when it may be corrected (the server's, never computed). */
	outcomeSource: DoctorOutcomeSource | null;
	outcomeAt: string | null;
	outcomeCorrectableUntil: string | null;
	confirmationMode: AppointmentConfirmationMode | null;
	/** 🔴 D-W51-71: an account's appointment, or one of the doctor's record (its facts are the record's). */
	patientKind: DoctorPatientKind;
	/** The account holder as booked: the patient, or the one who booked when it is for a relative. */
	patient: DoctorAppointmentPerson;
	relative: DoctorAppointmentRelative | null;
	patientNote: string | null;
	serviceLines: DoctorAppointmentServiceLine[];
	/** The cost as the server keeps it (the final amount, else the quoted one). */
	totalAmount: number | null;
	/** 🔴 D-W51-52: when the doctor set the final price («Τελική τιμή που ορίσατε.»); `null` for the services' own. */
	priceOverriddenAt: string | null;
	office: DoctorAppointmentOffice | null;
	/** When it was confirmed (`null`: never — a request, or one canceled as a request). */
	confirmedAt: string | null;
	canceledBy: DoctorAppointmentActor | null;
	canceledAt: string | null;
	cancelReasonCode: string | null;
	cancelReasonText: string | null;
	rejectedBy: DoctorAppointmentActor | null;
	rejectedAt: string | null;
	rejectReasonCode: string | null;
	rejectReasonText: string | null;
	actions: DoctorAppointmentActions;
	auditTrail: DoctorAppointmentAuditLine[];
	/** D-W51-33: the completed visits of the same person with this doctor before this one; `null` when not sent. */
	visitsWithDoctor: { count: number; lastAt: string | null } | null;
	/** D-W51-33 (U-90.1 Α2): the patient's cutoff and the very deadline the patient reads; `null` when not sent. */
	patientCancellation: { cutoffHours: number; deadline: string | null } | null;
	/** D-W51-33 · U-193.1: the conversation this doctor already holds with the account, else `null`. */
	conversationId: string | null;
	/**
	 * 🔴 D-W51-73: the key of the person's card of screen 73 — the doctor's record (a `RECORD`'s `patientId`), the relative
	 * (`relativeId`), else the account (`patientId`); `null` when the answer names no server id.
	 */
	patientKey: { kind: 'account' | 'relative' | 'record'; id: string } | null;
};

/**
 * 🔴 Screen 70 «Αλλαγή ώρας» (D-W51-41, D-W51-51): one read of the doctor's REAL free hours to move an appointment to
 * (U-189.1) — the office's zone, the visit's length, and each day asked with its hours (instants, the very ones the move
 * accepts), in order; a day with none is kept (it is drawn dimmed).
 */
export type DoctorRescheduleSlotsFacts = {
	timeZone: string;
	durationMinutes: number | null;
	days: { date: string; slots: { startTime: string; endTime: string }[] }[];
};

/**
 * 🔴 Screen 70 «Υπηρεσίες και κόστος» (D-W51-44, D-W51-52): one service of the doctor as the list with the ticks reads
 * it — its server id, its title in the page's language, its length and its price in euros.
 */
export type DoctorServiceFacts = {
	id: string;
	title: string;
	durationInMinutes: number;
	price: number;
};

/** 🔴 D-W51-44: the one write of «Υπηρεσίες και κόστος» (`PUT …/charges`), the contract's own body. */
export type DoctorChargesRequest = ApiRequestBody<'editAppointmentCharges'>;

/**
 * 🔴 D-W51-51 · D-W51-52: why a move or a change of the services was refused, as facts for the page — the session
 * (`401`), the hour taken or the appointment changed meanwhile (`409`, any but the visit that no longer fits), the hour that passed meanwhile
 * (`422 RESCHEDULE_INTO_THE_PAST`), the visit that no longer fits (`409 CHARGES_DO_NOT_FIT`, with the server's facts),
 * the state that no longer allows it (`403` / `404`), a field the server would not take (`422`, `400`), too many writes
 * (`429`), or nobody decided (a lost request, `5xx`).
 */
/**
 * 🔴 D-W51-62: why «Διόρθωση έκβασης» was refused — the session (`401`), the patient already wrote a review (`409` of the
 * correction to «Δεν ήρθε», U-196.1), the correction no longer allowed (any other `409`: the window passed, the outcome
 * changed meanwhile; `403` / `404`), too many writes (`429`), or nobody decided (a lost request, `422`, `5xx`).
 */
export type DoctorCorrectionFailureFacts = {
	kind: 'session' | 'rated' | 'closed' | 'rate-limited' | 'unknown';
	status: number;
};

export type DoctorWriteFailureFacts =
	| {
			kind: 'session' | 'conflict' | 'past' | 'closed' | 'invalid' | 'rate-limited' | 'unknown';
			status: number;
	  }
	| {
			kind: 'clash';
			status: number;
			/** How long the visit would last, and when the one it falls on starts (`null` when the server said none). */
			clash: { durationMinutes: number; nextStartTime: string } | null;
	  };

/**
 * 🔴 Screen 72 (D-W51-56, D-W51-70): the doctor's NEW appointment as the contract takes it (`POST /appointment/appointments`,
 * the doctor side): its doctor, office, hour, ONE service and `booked` (U-197.2), and exactly one person — an account
 * (`patientId`, the relative's id for a relative), the doctor's record (`patientRecordId`) or a new patient (`newPatient`).
 */
export type DoctorNewAppointmentRequest = ApiRequestBody<'createAppointment'>;

/** The fields of «Νέος ασθενής» a refusal may name (U-197.3). */
export type DoctorNewPatientField = 'firstName' | 'lastName' | 'phone' | 'email';

/**
 * 🔴 D-W51-70: why «Κλείσιμο ραντεβού» was refused — the session (`401`), the hour taken meanwhile (`409`: another
 * appointment or the linked calendar), a field of the new patient (`422`, with the fields it names; `400`), the person no
 * longer the doctor's (`404`: a record of another doctor or gone), the account may not (`403`: the office, the licence),
 * too many (`429`), or nobody decided (a lost request, `5xx`).
 */
export type DoctorBookFailureFacts = {
	kind: 'session' | 'taken' | 'invalid' | 'missing' | 'refused' | 'rate-limited' | 'unknown';
	status: number;
	fields: DoctorNewPatientField[];
};
