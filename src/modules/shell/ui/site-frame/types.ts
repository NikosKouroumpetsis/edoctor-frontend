import type { ResolvedPathname } from '$app/types';
import type { SupportedLocale } from '$shared/preferences/i18n';

/** The page's language as the frame's parts read their messages. */
export type FrameMessageOptions = { locale: SupportedLocale };

/** A product path made into the current language's resolved href (`/doctors` ⇒ `/en/doctors`). */
export type LocalizedHref = (path: string) => ResolvedPathname;
