<script lang="ts" module>
	import { SvelteSet } from 'svelte/reactivity';

	/** `contain` shows the whole photo on the muted ground; `cover` fills the frame (crops). */
	export type RevealingPhotoFit = 'contain' | 'cover';

	/**
	 * How a photo shows (U-14, U-14.6): `paint` it came with the server's page and lights up from the first paint (a
	 * CSS keyframe: seen without JavaScript, never hidden until hydration); `waiting` mounted in the browser — or the
	 * server's, still loading when the page came alive (MINOR-10 of r1) — transparent until it loads; `arriving` it
	 * loaded and lights up now; `shown` it was shown before in this session, at once.
	 */
	export type RevealingPhotoPhase = 'paint' | 'waiting' | 'arriving' | 'shown';

	export const revealingPhotoClasses: Record<RevealingPhotoPhase, string> = {
		paint: 'animate-reveal',
		waiting: 'opacity-0',
		arriving: 'animate-reveal',
		shown: ''
	};

	/**
	 * A photo's phase from where it came from (pure): the server's (`paint`; `pending` while it had not loaded when the
	 * page came alive: its 0.8 s would play on an empty frame), arrived on this mount, shown before.
	 */
	export function revealingPhotoPhase(facts: {
		paint: boolean;
		pending?: boolean;
		arrived: boolean;
		shownBefore: boolean;
	}): RevealingPhotoPhase {
		if (facts.paint && !facts.pending) return 'paint';
		if (facts.arrived) return 'arriving';
		if (facts.shownBefore) return 'shown';
		return 'waiting';
	}

	/**
	 * The addresses shown in this session (the application's `loadedPhotos`, U-14.6): ONE memory for every photo of the
	 * kit that reveals (the gallery, the tour, the viewer) — one of them shows at once on any later mount. Filled only
	 * in the browser (an effect or a `load`).
	 */
	const shownPhotos = new SvelteSet<string>();

	/** Whether this session has shown `url` already (a later mount draws it at once). */
	export function wasPhotoShown(url: string): boolean {
		return shownPhotos.has(url);
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { cn } from '$shared/lib/utils';

	let {
		url,
		alt,
		fit = 'cover',
		eager = false,
		onError,
		testId,
		class: className
	}: {
		url: string;
		/** The photo's words, already localized; `''` when a control around it is named instead. */
		alt: string;
		fit?: RevealingPhotoFit;
		/** The first photo of a page: asked at once (the rest when they near the screen). */
		eager?: boolean;
		/** The photo did not load (the caller draws its silhouette, S-32.13). */
		onError?: (url: string) => void;
		/** `<id>` the layer (its `data-phase`), `<id>-media` the image. */
		testId?: string;
		class?: string;
	} = $props();

	// Hydration-stable (`$props.id`): the server's markup of THIS photo is already in the page when its script runs in
	// the browser, never when it mounts after a navigation.
	const uid = $props.id();
	const serverBorn = !browser || document.querySelector(`[data-revealing-photo="${uid}"]`) !== null;
	const paintUrl = untrack(() => (serverBorn ? url : null));
	const shownAtMount = untrack(() => new Set(shownPhotos));
	let arrivedUrl = $state<string | null>(null);
	/** The server's photo had not loaded when the page came alive: it waits, then lights up at its `load`. */
	let paintPending = $state(false);
	let image = $state<HTMLImageElement | null>(null);

	const phase = $derived(
		revealingPhotoPhase({
			paint: url === paintUrl,
			pending: paintPending,
			arrived: url === arrivedUrl,
			shownBefore: shownAtMount.has(url)
		})
	);

	/** The photo arrived: it lights up now (unless shown already), and shows at once on any later mount. */
	function arrive(loaded: string) {
		if (loaded !== url) return;
		const waited = loaded !== paintUrl || paintPending;
		if (waited && !shownAtMount.has(loaded)) arrivedUrl = loaded;
		shownPhotos.add(loaded);
	}

	// The server's photo is a shown photo once the page lives — or, still loading then (a slow network, MINOR-10 of
	// r1), it waits for its `load`; a photo the browser already holds at mount (cache) has no `load` left: it arrives.
	$effect(() => {
		const node = image;
		untrack(() => {
			if (paintUrl && node && !node.complete) paintPending = true;
			else if (paintUrl) shownPhotos.add(paintUrl);
			if (node?.complete && node.naturalWidth > 0) arrive(node.getAttribute('src') ?? '');
		});
	});
</script>

<!-- 🔴 U-14 / U-14.6(α) (app = web, the application's `RevealingPhoto`): the photo lights up in 0.8 s on Airbnb's
     curve over the muted ground — a theme keyframe (`animate-reveal`), so it plays whatever the motion setting (U-12)
     and a photo of the server's page shows without JavaScript; one this session has shown, at once. -->
<span
	data-slot="revealing-photo"
	data-revealing-photo={uid}
	data-phase={phase}
	data-testid={testId}
	class={cn('absolute inset-0', revealingPhotoClasses[phase], className)}
>
	<img
		bind:this={image}
		src={url}
		{alt}
		loading={eager ? 'eager' : 'lazy'}
		decoding="async"
		draggable="false"
		onload={() => arrive(url)}
		onerror={() => onError?.(url)}
		data-testid={testId ? `${testId}-media` : undefined}
		class={cn('size-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
	/>
</span>
