import { createContext } from '$shared/lib/headless';

export type ChipGroupType = 'single' | 'multiple';

/** What a chip tells its group on every read: whether it is chosen, and whether it is a radio stop at all. */
export type ChipGroupEntry = () => { selected: boolean; eligible: boolean };

/**
 * What a `ChipGroup` tells its chips: one choice (radios) or many (toggles), and — for one choice — the one chip
 * that is the Tab stop (the chosen one, else the first), the roving `tabindex` of the radio pattern.
 */
export type ChipGroupContext = {
	readonly type: ChipGroupType;
	readonly tabStop: string | undefined;
	register(id: string, entry: ChipGroupEntry): () => void;
};

export const [, setChipGroupContext, getChipGroupContext] =
	createContext<ChipGroupContext>('ChipGroup');
