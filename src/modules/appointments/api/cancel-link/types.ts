import type { ApiRequestBody, AppointmentStatus } from '$shared/lib/api-client';

/**
 * 🔴 D-W51-72 · U-198.1: the page of one cancel link, FACTS only — the visit's state and hours on the office's clock, the
 * doctor (the public name and the specialty), the office (its address and the phone to call), the patient's terms and
 * whether it may be cancelled online now (`canCancel`) or the deadline passed (`late`). 🔴 NOTHING of the patient: the
 * server sends none, and none is kept here. Absence is `null`.
 */
export type AppointmentCancelLinkFacts = {
	status: AppointmentStatus;
	startTime: string;
	endTime: string | null;
	officeTimeZone: string;
	doctor: { name: string | null; specialty: string | null };
	office: {
		street: string | null;
		streetNumber: string | null;
		city: string | null;
		postalCode: string | null;
		floor: number | null;
		phone: string | null;
	};
	/** The patient's cutoff and the deadline the page prints (`null` once it may not be cancelled online). */
	cancellation: { cutoffHours: number; deadline: string | null } | null;
	canCancel: boolean;
	late: boolean;
};

/** 🔴 D-W51-72: the one write of the page — a reason of the patient's five and the words, at most 500. */
export type AppointmentCancelLinkRequest = ApiRequestBody<'cancelAppointmentByLink'>;

/**
 * Why the page's read or its cancel was refused: the link no longer holds (`404`, and a token the server refuses by its
 * shape, `422` of the read), the deadline passed meanwhile (`403 CANCEL_AFTER_CANCELLATION_CUTOFF`), the visit changed
 * meanwhile (`409`), a field (`422` of the write), too many (`429`), or nobody decided (a lost request, `5xx`).
 */
export type AppointmentCancelLinkFailure =
	| 'gone'
	| 'deadline'
	| 'changed'
	| 'invalid'
	| 'rate-limited'
	| 'unknown';
