import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { formatClock, readZonedParts, zonedDay } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { AccountSessionFacts } from '$modules/auth/api/sessions';
import type { SignInMethodsFacts, SignInProviderId } from '$modules/auth/api/sign-in-methods';
import {
	securityBrowserNames,
	securityDeviceIcons,
	securityDeviceNames,
	securityProviderNames,
	securityProviderSlugs,
	securityUnknownDeviceIcon
} from '$modules/auth/config/security';
import { authCodeLength, authFlowLifetimes } from '$modules/auth/config/sign-in';
import type { AccountPasswordFailure } from '$modules/auth/lib/failures';
import { readPasswordProblem } from '$modules/auth/lib/identity';
import type {
	SecurityPasswordField,
	SecurityPasswordRow,
	SecurityProviderRow,
	SecuritySessionRow
} from '$modules/auth/types';

type MessageOptions = { locale: SupportedLocale };

/**
 * Wave 4.5 · screen 59 (record §5.4, D-W45-37, D-W45-39): the row «Κωδικός πρόσβασης» from the server's two booleans —
 * a password that is set changes («Αλλαγή»), and may be forgotten only where a code can be mailed; one that is not set
 * is set with the mailed code («Ορισμός»), or — an account with no sign-in email — has no link and says what to do.
 */
export function buildSecurityPasswordRow(
	status: SignInMethodsFacts['passwordStatus'],
	options: MessageOptions
): SecurityPasswordRow {
	if (status.set) {
		return {
			set: true,
			value: m.auth_security_password_set({}, options),
			opens: 'change',
			actionLabel: m.auth_security_password_change({}, options),
			hint: null,
			canForget: status.canSet
		};
	}
	return {
		set: false,
		value: m.auth_security_password_not_set({}, options),
		opens: status.canSet ? 'code' : null,
		actionLabel: status.canSet ? m.auth_security_password_set_up({}, options) : null,
		hint: status.canSet ? null : m.auth_security_password_needs_email({}, options),
		canForget: false
	};
}

/**
 * The line of help of the open row: the change says what it does to the other devices; the code says where it went —
 * 🔴 U-168: the address exactly as the SERVER hides it, or no address at all.
 */
export function securityPasswordHelp(
	mode: 'change' | 'code',
	maskedEmail: string | null | undefined,
	options: MessageOptions
): string {
	if (mode === 'change') return m.auth_security_password_change_help({}, options);
	const email = maskedEmail?.trim();
	return email
		? m.auth_security_password_code_help({ email }, options)
		: m.auth_security_password_code_help_plain({}, options);
}

/** A provider's name: a brand's, the same in every language. */
export function securityProviderName(provider: SignInProviderId): string {
	return securityProviderNames[provider];
}

/** 🔴 D-W45-38: what «Αποσύνδεση» says of a provider that may not go — there would be no way in left. */
export function securityProviderRefusal(
	provider: SignInProviderId,
	options: MessageOptions
): string {
	return m.auth_security_providers_refusal({ provider: securityProviderName(provider) }, options);
}

/** The providers linked to the account, as rows (record §5.4: only what is linked shows). */
export function buildSecurityProviderRows(
	providers: SignInMethodsFacts['providers'],
	options: MessageOptions
): SecurityProviderRow[] {
	return providers.map(({ provider, canUnlink }) => ({
		provider,
		slug: securityProviderSlugs[provider],
		name: securityProviderName(provider),
		status: m.auth_security_providers_connected({}, options),
		canUnlink,
		refusal: securityProviderRefusal(provider, options)
	}));
}

/** The question «Αποσύνδεση του Google;», its line, and the passing word once it is done. */
export function securityUnlinkWords(provider: SignInProviderId, options: MessageOptions) {
	const name = { provider: securityProviderName(provider) };
	return {
		title: m.auth_security_providers_ask_title(name, options),
		body: m.auth_security_providers_ask_body(name, options),
		done: m.auth_security_messages_unlinked(name, options)
	};
}

type DeviceWords = Pick<AccountSessionFacts, 'kind' | 'os' | 'browser'>;

/**
 * 🔴 D-W45-35: «συσκευή · browser ή εφαρμογή», composed HERE from the server's three closed vocabularies — «iPhone ·
 * εφαρμογή eDoctor», «macOS · Chrome» — the application's own rule (`w45-a6` Κ1): both halves known, both; one half
 * `OTHER`, the other alone («macOS», «Chrome», «εφαρμογή eDoctor»); none, or a kind the page does not know, «Άγνωστη
 * συσκευή». A word outside the vocabularies is `OTHER` already: it is never printed.
 */
export function securityDeviceName(device: DeviceWords, options: MessageOptions): string {
	const unknown = m.auth_security_devices_unknown({}, options);
	if (device.kind === 'OTHER') return unknown;
	const system: string | null = device.os === 'OTHER' ? null : securityDeviceNames[device.os];
	const client: string | null =
		device.kind === 'APP'
			? m.auth_security_devices_app({}, options)
			: device.browser && device.browser !== 'OTHER'
				? securityBrowserNames[device.browser]
				: null;
	if (system && client) return m.auth_security_devices_name({ system, client }, options);
	return system ?? client ?? unknown;
}

/** The glyph of a device by its system: a phone, a tablet, else a computer — as the application draws it. */
export function securityDeviceIcon(device: DeviceWords): SecuritySessionRow['icon'] {
	return device.os === 'OTHER' ? securityUnknownDeviceIcon : securityDeviceIcons[device.os];
}

/**
 * «12 Νοεμβρίου 2026 στις 09:27»: when a device was last active, on the platform's clock (D-118), with the site's own
 * formatters; `null` for no instant.
 */
export function securitySessionWhen(
	instant: number | null,
	locale: SupportedLocale
): string | null {
	if (instant === null || !Number.isFinite(instant)) return null;
	const { hour, minute } = readZonedParts(instant, PLATFORM_TIME_ZONE);
	const date = formatCalendarDay(zonedDay(instant, PLATFORM_TIME_ZONE), locale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
	const time = formatClock(hour * 60 + minute);
	return date && time ? m.auth_security_devices_last_active({ date, time }, { locale }) : null;
}

/** The devices as rows, in the server's order — THIS device first (D-W45-40) — numbered from 0, as the application's. */
export function buildSecuritySessionRows(
	sessions: readonly AccountSessionFacts[],
	options: MessageOptions
): SecuritySessionRow[] {
	return sessions.map((session, position) => ({
		sessionId: session.sessionId,
		index: position,
		current: session.current,
		icon: securityDeviceIcon(session),
		name: securityDeviceName(session, options),
		when: securitySessionWhen(session.lastActiveAt, options.locale)
	}));
}

/** 🔴 U-65.6: the mailed code as its field keeps it — digits alone, six at most. */
export function cleanSecurityCode(typed: string): string {
	return typed.replace(/\D/gu, '').slice(0, authCodeLength);
}

/** The page's own check of the mailed code before any request: «Ο κωδικός έχει 6 ψηφία.». */
export function securityCodeError(code: string, options: MessageOptions): string | undefined {
	return code.length === authCodeLength
		? undefined
		: m.auth_security_password_errors_code_length({}, options);
}

/** The page's own check of a new password before any request: the sign-in's rule and its words. */
export function securityNewPasswordError(
	password: string,
	options: MessageOptions
): string | undefined {
	const problem = readPasswordProblem(password);
	if (problem === 'too-short') return m.auth_security_password_errors_new_length({}, options);
	return problem === 'too-weak'
		? m.auth_security_password_errors_new_strength({}, options)
		: undefined;
}

/**
 * The page's own check of the current password: one that is empty is asked for; one shorter than any password can be
 * (the server refuses it unread) is simply not the account's.
 */
export function securityCurrentPasswordError(
	password: string,
	options: MessageOptions
): string | undefined {
	if (password === '') return m.auth_security_password_errors_current_required({}, options);
	return readPasswordProblem(password) === 'too-short'
		? m.auth_security_password_errors_current_wrong({}, options)
		: undefined;
}

/**
 * The words of a refused write of the password and where they are said: under the field they speak of, or (`field:
 * null`) over the form. `null` for what the page handles itself with no word: the session, and an account that has no
 * password after all (the row closes on what the server holds now). The server's own message is never drawn.
 */
export function securityPasswordFailureWords(
	kind: AccountPasswordFailure,
	options: MessageOptions
): { field: SecurityPasswordField | null; message: string } | null {
	switch (kind) {
		case 'session':
		case 'no-password':
			return null;
		case 'wrong-password':
			return {
				field: 'current',
				message: m.auth_security_password_errors_current_wrong({}, options)
			};
		case 'invalid-code':
			return { field: 'code', message: m.auth_security_password_errors_code_invalid({}, options) };
		case 'stale-code':
			return { field: 'code', message: m.auth_security_password_errors_code_stale({}, options) };
		case 'invalid-value':
			return { field: 'new', message: m.auth_security_password_errors_new_length({}, options) };
		case 'locked':
			return { field: null, message: m.auth_security_password_errors_locked({}, options) };
		case 'rate-limited':
			return { field: null, message: m.auth_security_errors_rate_limited({}, options) };
		case 'unavailable':
			return { field: null, message: m.auth_security_password_errors_unavailable({}, options) };
		default:
			return { field: null, message: m.auth_security_errors_unknown({}, options) };
	}
}

/** The words of a code that could not be mailed (the send, «Αποστολή ξανά»); `null` for the session. */
export function securityCodeSendFailureWords(
	kind: AccountPasswordFailure,
	options: MessageOptions
): string | null {
	if (kind === 'session') return null;
	if (kind === 'rate-limited') return m.auth_security_errors_rate_limited({}, options);
	if (kind === 'unavailable') return m.auth_security_password_errors_unavailable({}, options);
	return m.auth_security_errors_unknown({}, options);
}

/** The words of a provider that was not unlinked, or of a device that was not signed out, for want of the server. */
export function securityActionFailureWords(
	kind: 'rate-limited' | 'unknown',
	options: MessageOptions
): string {
	return kind === 'rate-limited'
		? m.auth_security_errors_rate_limited({}, options)
		: m.auth_security_errors_unknown({}, options);
}

/** When «Αποστολή ξανά» may send again: the server's own spacing after a send. */
export function securityResendDeadline(now: number): number {
	return now + authFlowLifetimes.resendCooldownMs;
}

/** The whole seconds left until then; 0 when a code may be asked for. */
export function securityResendSecondsLeft(deadline: number | null, now: number): number {
	return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** «Περιμένετε 42 δευτερόλεπτα για νέο κωδικό.»: a resend asked too soon (the 58's words, the application's). */
export function securityResendWaitLabel(seconds: number, options: MessageOptions): string {
	return seconds === 1
		? m.auth_security_password_resend_wait_one({ seconds }, options)
		: m.auth_security_password_resend_wait_other({ seconds }, options);
}
