import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type {
	DoctorBookingPolicyFacts,
	DoctorProfile,
	DoctorResponseTimeId
} from '$modules/doctor/api/profile';
import { emphasizedSegments } from '../labels';
import { doctorOfficeLabel } from '../office';
import type {
	DoctorKnowBlock,
	DoctorKnowContent,
	DoctorKnowGroup,
	DoctorKnowPage,
	DoctorKnowPageId,
	DoctorKnowRow,
	DoctorKnowRowId,
	DoctorLocation
} from '../types';

const PAGE_IDS: readonly DoctorKnowPageId[] = ['cancel', 'booking', 'before'];

/** A page's id from an address (`details/know?focus=…`): anything else opens nothing. */
export function isDoctorKnowPageId(value: string | undefined): value is DoctorKnowPageId {
	return PAGE_IDS.some((id) => id === value);
}

const RESPONSE_WORDS = {
	'within-hour': m.doctor_know_response_within_hour,
	'within-few-hours': m.doctor_know_response_within_few_hours,
	'within-day': m.doctor_know_response_within_day,
	'few-days': m.doctor_know_response_few_days
} as const satisfies Record<DoctorResponseTimeId, unknown>;

const RESPONSE_SUBS = {
	'within-hour': m.doctor_know_response_sub_within_hour,
	'within-few-hours': m.doctor_know_response_sub_within_few_hours,
	'within-day': m.doctor_know_response_sub_within_day,
	'few-days': m.doctor_know_response_sub_few_days
} as const satisfies Record<DoctorResponseTimeId, unknown>;

type Options = { locale: SupportedLocale };

function hoursLabel(hours: number, options: Options): string {
	return hours === 1
		? m.doctor_know_hours_one({ hours }, options)
		: m.doctor_know_hours_other({ hours }, options);
}

function row(
	id: DoctorKnowRowId,
	label: string,
	sub?: string,
	extra: Partial<DoctorKnowRow> = {}
): DoctorKnowRow {
	return { id, key: extra.key ?? id, label, ...(sub ? { sub } : {}), ...extra };
}

type OfficePolicy = { officeId: string; label: string; policy: DoctorBookingPolicyFacts };

/**
 * U-75.1 Ε4: «Στα άλλα ιατρεία»: the offices whose value differs from the active one's, grouped by that value
 * («Ermou 81 · Dimokratias 5»); nothing when they all agree.
 */
function otherOffices(
	offices: OfficePolicy[],
	active: OfficePolicy,
	keyOf: (policy: DoctorBookingPolicyFacts) => string,
	subOf: (policy: DoctorBookingPolicyFacts) => string,
	options: Options
): DoctorKnowGroup[] {
	const byKey = new Map<string, OfficePolicy[]>();
	for (const office of offices) {
		const key = keyOf(office.policy);
		if (office.officeId === active.officeId || key === keyOf(active.policy)) continue;
		byKey.set(key, [...(byKey.get(key) ?? []), office]);
	}
	const rows = [...byKey.entries()].flatMap(([key, list]) => {
		const [first] = list;
		return first
			? [
					row('other-office', list.map((office) => office.label).join(' · '), subOf(first.policy), {
						key: `other-${key}`
					})
				]
			: [];
	});
	return rows.length > 0 ? [{ heading: m.doctor_know_other_offices({}, options), rows }] : [];
}

/**
 * 🔴 U-76, U-90.1 (`P-A` §8.4, which replaces the prototype's words): up to its deadline; after it the appointment is
 * not cancelled online, and the office's phone is what is left. U-75.2: no charge, in no word.
 */
function cancelPage(
	offices: OfficePolicy[],
	active: OfficePolicy,
	phone: { label: string; dialNumber: string } | undefined,
	forOffice: string,
	options: Options
): DoctorKnowPage {
	const hours = hoursLabel(active.policy.cancellationCutoffHours, options);
	const intro = m.doctor_know_cancel_intro({}, options);
	return {
		id: 'cancel',
		title: m.doctor_know_cancel_title({}, options),
		intro: [{ emphasis: false, text: intro }, ...officeSegments(forOffice, active.label)],
		groups: [
			{
				heading: m.doctor_know_cancel_group({}, options),
				rows: [
					row(
						'cancel-until',
						m.doctor_know_cancel_until({ hours }, options),
						m.doctor_know_cancel_until_sub({}, options)
					),
					phone
						? row(
								'cancel-after',
								m.doctor_know_cancel_after({}, options),
								m.doctor_know_cancel_contact({}, options),
								{ phone }
							)
						: row(
								'cancel-after',
								m.doctor_know_cancel_after({}, options),
								m.doctor_know_cancel_contact_no_phone({}, options)
							),
					row('cancel-request', m.doctor_know_cancel_request({}, options)),
					row('cancel-moved', m.doctor_know_cancel_moved({}, options))
				]
			},
			{
				heading: m.doctor_know_change_group({}, options),
				rows: [
					row(
						'change-until',
						m.doctor_know_change_until({ hours }, options),
						m.doctor_know_change_until_sub({}, options)
					)
				]
			},
			{
				heading: m.doctor_know_doctor_cancels_group({}, options),
				rows: [row('doctor-cancels', m.doctor_know_doctor_cancels({}, options))]
			},
			...otherOffices(
				offices,
				active,
				(policy) => String(policy.cancellationCutoffHours),
				(policy) =>
					m.doctor_know_cancel_other(
						{ hours: hoursLabel(policy.cancellationCutoffHours, options) },
						options
					),
				options
			)
		],
		link: { id: 'help-cancellation', label: m.doctor_know_help({}, options) }
	};
}

/** «Στα άλλα ιατρεία» of the booking: how each confirms and how far ahead it asks (`0` asks nothing). */
function bookingOtherLine(policy: DoctorBookingPolicyFacts, options: Options): string {
	const notice = policy.minBookingNoticeHours;
	if (policy.confirmationMode === 'AUTO') {
		return notice > 0
			? m.doctor_know_booking_other_auto({ hours: hoursLabel(notice, options) }, options)
			: m.doctor_know_booking_other_auto_plain({}, options);
	}
	return notice > 0
		? m.doctor_know_booking_other_manual({ hours: hoursLabel(notice, options) }, options)
		: m.doctor_know_booking_other_manual_plain({}, options);
}

function bookingPage(
	offices: OfficePolicy[],
	active: OfficePolicy,
	responseId: DoctorResponseTimeId | undefined,
	forOffice: string,
	options: Options
): DoctorKnowPage {
	const { confirmationMode, minBookingNoticeHours } = active.policy;
	const auto = confirmationMode === 'AUTO';
	const rows: DoctorKnowRow[] = auto
		? [
				row(
					'auto',
					m.doctor_know_booking_auto({}, options),
					m.doctor_know_booking_auto_sub({}, options)
				)
			]
		: [
				row(
					'manual',
					m.doctor_know_booking_manual({}, options),
					responseId
						? RESPONSE_SUBS[responseId]({}, options)
						: m.doctor_know_booking_manual_sub_plain({}, options)
				),
				row(
					'expiry',
					m.doctor_know_booking_expiry({}, options),
					m.doctor_know_booking_expiry_sub({}, options)
				)
			];
	if (minBookingNoticeHours > 0) {
		rows.push(
			row(
				'notice',
				m.doctor_know_booking_notice(
					{ hours: hoursLabel(minBookingNoticeHours, options) },
					options
				),
				m.doctor_know_booking_notice_sub({}, options)
			)
		);
	}
	rows.push(
		row('who', m.doctor_know_booking_who({}, options), m.doctor_know_booking_who_sub({}, options)),
		row(
			'account',
			m.doctor_know_booking_account({}, options),
			m.doctor_know_booking_account_sub({}, options)
		),
		row(
			'free',
			m.doctor_know_booking_free({}, options),
			m.doctor_know_booking_free_sub({}, options)
		)
	);
	const intro = auto
		? m.doctor_know_booking_intro_auto({}, options)
		: m.doctor_know_booking_intro_manual({}, options);
	return {
		id: 'booking',
		title: m.doctor_know_booking_title({}, options),
		intro: [{ emphasis: false, text: intro }, ...officeSegments(forOffice, active.label)],
		groups: [
			{ rows },
			...otherOffices(
				offices,
				active,
				(policy) => `${policy.confirmationMode}|${policy.minBookingNoticeHours}`,
				(policy) => bookingOtherLine(policy, options),
				options
			)
		],
		link: { id: 'help-booking', label: m.doctor_know_help({}, options) }
	};
}

/** U-75.3 (`texts/what-to-bring.md`): «Πριν από την επίσκεψη», and the platform's general text of what to bring. */
function beforePage(
	officeLabel: string | undefined,
	payments: string[],
	options: Options
): DoctorKnowPage {
	const template = m.doctor_know_before_intro({ office: '{office}' }, options);
	return {
		id: 'before',
		title: m.doctor_know_before_title({}, options),
		intro: officeLabel ? emphasizedSegments(template, { office: officeLabel }) : [],
		groups: [
			{
				rows: [
					row(
						'reminder',
						m.doctor_know_before_reminder({}, options),
						m.doctor_know_before_reminder_sub({}, options)
					),
					row(
						'note',
						m.doctor_know_before_note({}, options),
						m.doctor_know_before_note_sub({}, options)
					),
					...(payments.length > 0
						? [row('payment', m.doctor_office_payment_methods({}, options), payments.join(' · '))]
						: [])
				]
			},
			{
				heading: m.doctor_know_bring_title({}, options),
				intro: m.doctor_know_bring_intro({}, options),
				rows: [
					row(
						'bring-id',
						m.doctor_know_bring_id({}, options),
						m.doctor_know_bring_id_sub({}, options)
					),
					row(
						'bring-amka',
						m.doctor_know_bring_amka({}, options),
						m.doctor_know_bring_amka_sub({}, options)
					),
					row(
						'bring-tests',
						m.doctor_know_bring_tests({}, options),
						m.doctor_know_bring_tests_sub({}, options)
					),
					row(
						'bring-medicines',
						m.doctor_know_bring_medicines({}, options),
						m.doctor_know_bring_medicines_sub({}, options)
					),
					row(
						'bring-referral',
						m.doctor_know_bring_referral({}, options),
						m.doctor_know_bring_referral_sub({}, options)
					)
				]
			}
		],
		link: { id: 'offices', label: m.doctor_know_before_offices({}, options) }
	};
}

/** « Ισχύει για το ιατρείο **Χ**.» after an intro, only when the offices differ (`forOffice` the sentence's template). */
function officeSegments(forOffice: string, office: string) {
	if (!forOffice) return [];
	return [{ emphasis: false, text: ' ' }, ...emphasizedSegments(forOffice, { office })];
}

/**
 * 🔴 U-75, U-76 (screen 24): the profile's last section, on the ONE active office (U-39.1). The first two blocks only
 * once the server has said the office's rules (never an «8» of ours), the third always; a doctor without services books
 * nothing, so has no section (U-38). Every word from the doctor or the office is text (U-65.6).
 */
export function buildDoctorKnowContent({
	doctor,
	activeOfficeId,
	location,
	phone,
	dialNumber,
	locale
}: {
	doctor: DoctorProfile;
	activeOfficeId: string | undefined;
	location: DoctorLocation | undefined;
	phone: string | undefined;
	dialNumber: string | undefined;
	locale: SupportedLocale;
}): DoctorKnowContent | undefined {
	if ((doctor.services ?? []).length === 0) return undefined;
	const options = { locale };
	const roster = doctor.offices ?? [];
	const offices: OfficePolicy[] = roster.flatMap((office) =>
		office.bookingPolicy
			? [
					{
						officeId: office.officeId,
						label: doctorOfficeLabel(roster, office.officeId, locale),
						policy: office.bookingPolicy
					}
				]
			: []
	);
	const active = offices.find((office) => office.officeId === activeOfficeId);
	const signature = (office: OfficePolicy) =>
		`${office.policy.confirmationMode}|${office.policy.cancellationCutoffHours}|${office.policy.minBookingNoticeHours}`;
	const differs = new Set(offices.map(signature)).size > 1;
	const activeLabel = activeOfficeId
		? doctorOfficeLabel(roster, activeOfficeId, locale)
		: undefined;
	const forOffice = differs ? m.doctor_know_for_office({ office: '{office}' }, options) : '';
	const payments = (location?.paymentMethods?.options ?? []).map((option) => option.label);
	const responseId = doctor.responseMetrics?.responseTimeId;
	const blocks: DoctorKnowBlock[] = [];
	const pages: DoctorKnowContent['pages'] = {};
	if (active) {
		const { cancellationCutoffHours, confirmationMode, minBookingNoticeHours } = active.policy;
		blocks.push({
			id: 'cancel',
			title: m.doctor_know_cancel_title({}, options),
			lines: [
				m.doctor_know_cancel_summary(
					{ hours: hoursLabel(cancellationCutoffHours, options) },
					options
				),
				m.doctor_know_cancel_summary_after({}, options)
			]
		});
		pages.cancel = cancelPage(
			offices,
			active,
			phone && dialNumber ? { label: phone, dialNumber } : undefined,
			forOffice,
			options
		);
		const confirmation =
			confirmationMode === 'AUTO'
				? m.doctor_know_booking_summary_auto({}, options)
				: responseId
					? m.doctor_know_booking_summary_manual(
							{ response: RESPONSE_WORDS[responseId]({}, options) },
							options
						)
					: m.doctor_know_booking_summary_manual_plain({}, options);
		blocks.push({
			id: 'booking',
			title: m.doctor_know_booking_title({}, options),
			lines: [
				confirmation,
				...(minBookingNoticeHours > 0
					? [
							m.doctor_know_booking_summary_notice(
								{ hours: hoursLabel(minBookingNoticeHours, options) },
								options
							)
						]
					: [])
			]
		});
		pages.booking = bookingPage(offices, active, responseId, forOffice, options);
	}
	blocks.push({
		id: 'before',
		title: m.doctor_know_before_title({}, options),
		lines: [
			m.doctor_know_before_summary({}, options),
			...(payments.length > 0
				? [m.doctor_know_before_summary_payment({ methods: payments.join(', ') }, options)]
				: [])
		]
	});
	pages.before = beforePage(activeLabel, payments, options);
	return {
		title: m.doctor_know_title({}, options),
		...(differs && active
			? { officeLine: emphasizedSegments(forOffice, { office: active.label }) }
			: {}),
		blocks,
		pages
	};
}
