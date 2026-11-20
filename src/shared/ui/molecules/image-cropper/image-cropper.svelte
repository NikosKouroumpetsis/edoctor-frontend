<script lang="ts">
	import {
		CENTRED_IMAGE_CROP,
		clampImageCrop,
		imageCropRect,
		maxImageCropZoom,
		panImageCrop,
		type ImageCrop,
		type ImageCropRules,
		type ImageSize
	} from '$shared/lib/image';
	import { cn } from '$shared/lib/utils';
	import { Slider } from '$shared/ui/primitives/slider';

	let {
		src,
		source,
		rules,
		crop = $bindable(CENTRED_IMAGE_CROP),
		label,
		describedBy,
		zoomLabel,
		disabled = false,
		testId,
		class: className
	}: {
		/** The picture the frame draws. */
		src: string;
		/** Its own size in pixels: every measure of the cut is taken of it. */
		source: ImageSize;
		/** The cut's shape and the least it may hold. */
		rules: ImageCropRules;
		/** What the person chose; the caller reads the cut of it (`imageCropRect`). */
		crop?: ImageCrop;
		/** The frame's name, already localized. */
		label: string;
		/** The id of the words that say what dragging does. */
		describedBy?: string;
		/** The slider's name, already localized; written beside it too. */
		zoomLabel: string;
		disabled?: boolean;
		testId?: string;
		class?: string;
	} = $props();

	// One arrow moves the cut a twentieth of the frame; ten presses of «+» take the zoom from one end to the other.
	const PAN_STEP = 0.05;
	const ZOOM_STEPS = 10;

	const maxZoom = $derived(maxImageCropZoom(source, rules) ?? 1);
	const room = $derived(maxZoom > 1);
	const rect = $derived(imageCropRect(source, rules, crop));
	// The frame shows the cut and nothing else: the picture is placed by the cut's own measures, in percentages, so no
	// size of the screen is ever read to draw it.
	const drawn = $derived({
		left: `${(-rect.x / rect.width) * 100}%`,
		top: `${(-rect.y / rect.height) * 100}%`,
		width: `${(source.width / rect.width) * 100}%`,
		height: `${(source.height / rect.height) * 100}%`
	});
	const percent = (zoom: number) => `${Math.round(zoom * 100)}%`;

	let frame = $state<HTMLButtonElement | null>(null);
	let held = $state<{ pointer: number; x: number; y: number } | null>(null);

	function pan(dx: number, dy: number) {
		crop = panImageCrop(source, rules, crop, dx, dy);
	}

	/** The zoom in hundredths, the slider's own step, so a sum of steps never drifts off it. */
	function zoomTo(zoom: number) {
		crop = clampImageCrop(source, rules, { ...crop, zoom: Math.round(zoom * 100) / 100 });
	}

	function onpointerdown(event: PointerEvent) {
		if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
		held = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
		frame?.setPointerCapture?.(event.pointerId);
	}

	function onpointermove(event: PointerEvent) {
		if (!held || held.pointer !== event.pointerId || !frame) return;
		const box = frame.getBoundingClientRect();
		if (box.width > 0 && box.height > 0) {
			pan((event.clientX - held.x) / box.width, (event.clientY - held.y) / box.height);
		}
		held = { pointer: held.pointer, x: event.clientX, y: event.clientY };
	}

	function release(event: PointerEvent) {
		if (!held || held.pointer !== event.pointerId) return;
		held = null;
		frame?.releasePointerCapture?.(event.pointerId);
	}

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;
		const zoomStep = (maxZoom - 1) / ZOOM_STEPS;
		switch (event.key) {
			case 'ArrowLeft':
				pan(PAN_STEP, 0);
				break;
			case 'ArrowRight':
				pan(-PAN_STEP, 0);
				break;
			case 'ArrowUp':
				pan(0, PAN_STEP);
				break;
			case 'ArrowDown':
				pan(0, -PAN_STEP);
				break;
			case '+':
			case '=':
				zoomTo(crop.zoom + zoomStep);
				break;
			case '-':
			case '_':
				zoomTo(crop.zoom - zoomStep);
				break;
			default:
				return;
		}
		event.preventDefault();
	}
</script>

<!-- 🔴 D-W52-40 (wave 5.2, `64-switch/sw.js` `phCrop`): the part of a picture that is kept, chosen on the device — a
     frame of the cut's shape that shows exactly what is kept, dragged to move it (the arrows too) and a slider to go in
     (`+` / `−` too). The cut never leaves the picture and never holds fewer pixels than the least allowed; a picture
     with no room to go in has its slider asleep. The frame is one control with the caller's name; every word is the
     caller's. No colour under the pointer (U-100). -->
<div data-slot="image-cropper" data-testid={testId} class={cn('flex flex-col gap-3', className)}>
	<button
		bind:this={frame}
		type="button"
		aria-label={label}
		aria-describedby={describedBy}
		{disabled}
		data-slot="image-cropper-frame"
		data-dragging={held ? '' : undefined}
		{onpointerdown}
		{onpointermove}
		onpointerup={release}
		onpointercancel={release}
		{onkeydown}
		style:aspect-ratio={rules.aspect}
		class="relative block min-h-touch w-full min-w-touch cursor-grab touch-none overflow-hidden rounded-md bg-secondary outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed data-dragging:cursor-grabbing"
	>
		<img
			{src}
			alt=""
			draggable="false"
			data-slot="image-cropper-image"
			style:left={drawn.left}
			style:top={drawn.top}
			style:width={drawn.width}
			style:height={drawn.height}
			class="pointer-events-none absolute max-w-none"
		/>
	</button>
	<div class="flex flex-row items-center gap-1">
		<span aria-hidden="true" class="shrink-0 text-body-sm text-muted-foreground">{zoomLabel}</span>
		<div class="min-w-0 flex-1">
			<Slider
				aria-label={zoomLabel}
				min={1}
				max={room ? maxZoom : 2}
				step={0.01}
				value={room ? crop.zoom : 1}
				disabled={disabled || !room}
				formatValue={percent}
				onValueChange={(value) => zoomTo(Array.isArray(value) ? value[0] : value)}
				data-testid={testId ? `${testId}-zoom` : undefined}
			/>
		</div>
	</div>
</div>
