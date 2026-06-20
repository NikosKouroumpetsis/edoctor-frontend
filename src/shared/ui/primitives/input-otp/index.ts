import Root, {
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
	type InputOtpContext,
	type OtpSlotState
} from './input-otp.svelte';
import Group from './input-otp-group.svelte';
import Slot from './input-otp-slot.svelte';
import Separator from './input-otp-separator.svelte';

export {
	Root,
	Group,
	Slot,
	Separator,
	REGEXP_ONLY_DIGITS,
	REGEXP_ONLY_CHARS,
	REGEXP_ONLY_DIGITS_AND_CHARS,
	type InputOtpContext,
	type OtpSlotState,
	//
	Root as InputOTP,
	Group as InputOTPGroup,
	Slot as InputOTPSlot,
	Separator as InputOTPSeparator
};
