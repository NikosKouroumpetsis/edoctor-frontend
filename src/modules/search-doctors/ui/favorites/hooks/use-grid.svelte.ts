import { tick, untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { motion } from '$shared/design/tokens';
import { measureFlip, playFlip } from '$shared/lib/headless';
import type { SearchResultCard } from '$modules/search-doctors/types';

const CARD = '[data-flip-key]';
const idsOf = (cards: readonly SearchResultCard[]) => cards.map((card) => card.id);

/**
 * `20-favorites` Π4 (U-12.2: the motion is CSS, this only keeps and measures): what the grid draws. A doctor removed
 * stays drawn while it fades (`leaving`), then the others glide into its place (FLIP); one that comes back (`entering`,
 * «Αναίρεση» or a refusal) does the reverse. The search only filters: its cards come and go at once, so typing never
 * animates, and the fade of a removal stays the same while it filters.
 */
export function useFavoritesGrid(
	all: () => readonly SearchResultCard[],
	visible: () => readonly SearchResultCard[],
	title: () => HTMLElement | null
) {
	let shown = $state.raw<readonly SearchResultCard[]>([]);
	let node = $state<HTMLElement | null>(null);
	const leaving = new SvelteSet<string>();
	const entering = new SvelteSet<string>();
	let known: string[] | null = null;
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	let enterTimer: ReturnType<typeof setTimeout> | undefined;

	/**
	 * `w2-w3` §Ανοιχτά 4: the card that goes takes the focused heart with it, and the keyboard would start over from the
	 * page's top: its place goes to the next card, else to the title. Only a keyboard's focus moves the page to it.
	 */
	function handOverFocus() {
		const active = document.activeElement;
		if (!node || !active) return;
		const cards = [...node.querySelectorAll<HTMLElement>(CARD)];
		const from = cards.findIndex(
			(card) => leaving.has(card.dataset.flipKey ?? '') && card.contains(active)
		);
		if (from === -1) return;
		const stays = idsOf(visible());
		const next = cards.slice(from + 1).find((card) => {
			const id = card.dataset.flipKey ?? '';
			return stays.includes(id) && !leaving.has(id);
		});
		const target = next?.querySelector<HTMLElement>('a[href]') ?? title();
		target?.focus({ preventScroll: !active.matches(':focus-visible') });
	}

	function settle(animate: boolean, added: readonly string[]) {
		const before = animate && node ? measureFlip(node) : null;
		shown = visible();
		if (added.length > 0) {
			added.forEach((id) => entering.add(id));
			clearTimeout(enterTimer);
			enterTimer = setTimeout(() => entering.clear(), motion.duration.standard);
		}
		if (!before) return;
		void tick().then(() => {
			if (node) playFlip(node, before);
		});
	}

	function reconcile() {
		const ids = idsOf(all());
		const first = known === null;
		const added = first ? [] : ids.filter((id) => !known?.includes(id));
		const changed = !first && ids.join() !== known?.join();
		known = ids;
		// Back while it faded (a quick «Αναίρεση»): it stays where it is.
		leaving.forEach((id) => {
			if (ids.includes(id)) leaving.delete(id);
		});
		const gone = idsOf(shown).filter((id) => !ids.includes(id));
		if (gone.length > 0) {
			gone.forEach((id) => leaving.add(id));
			clearTimeout(leaveTimer);
			leaveTimer = setTimeout(() => {
				leaveTimer = undefined;
				handOverFocus();
				leaving.clear();
				settle(true, added);
			}, motion.duration.standard);
			return;
		}
		if (leaveTimer !== undefined) return;
		settle(changed, added);
	}

	$effect.pre(() => {
		all();
		visible();
		untrack(reconcile);
	});

	$effect(() => () => {
		clearTimeout(leaveTimer);
		clearTimeout(enterTimer);
	});

	return {
		get shown() {
			return shown;
		},
		leaving: (id: string) => leaving.has(id),
		entering: (id: string) => entering.has(id),
		setNode(element: HTMLElement | null) {
			node = element;
		}
	};
}
