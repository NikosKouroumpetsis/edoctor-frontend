/**
 * 🔴 Π2 (U-30.1): the ‹ › of a sideways row — the rails, the date strip, the photo carousel — show from a zone up, by
 * CSS alone (U-03.1). ONE map of their classes, below the atomic layers that use it (a molecule never imports an
 * organism); `Rail` re-exports it under its own names.
 */
export type RailControlsFrom = 'tablet' | 'split' | 'laptop';

/** The names of a row's ‹ ›, in the page's language. */
export type RailScrollLabels = { previous: string; next: string };

export const railControlsClasses: Record<RailControlsFrom, string> = {
	tablet: 'hidden tablet:flex',
	split: 'hidden split:flex',
	laptop: 'hidden laptop:flex'
};
