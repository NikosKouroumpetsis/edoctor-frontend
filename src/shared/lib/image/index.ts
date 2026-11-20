/**
 * A picture the person picks on this device, before and after it is sent (wave 5.2, D-W52-06): what is checked of the
 * file before a byte leaves (its type, its weight, its size in pixels), how it is read for a JSON body, and how a part
 * of a picture is chosen and cut on the device. Nothing here knows whose picture it is, nor a word of any page.
 */

/** A picture's size in pixels. */
export type ImageSize = { width: number; height: number };

/** What a picked file must be: one of the MIME types, no heavier than `maxBytes`, at least `minWidth` × `minHeight`. */
export type ImageFileRules = {
	types: readonly string[];
	maxBytes: number;
	minWidth: number;
	minHeight: number;
};

/** Why a picked file is not sent: not a picture of the types, too heavy, too few pixels. */
export type ImageFileIssue = 'type' | 'size' | 'dimensions';

/**
 * A picked file's size in pixels as the browser draws it (the camera's rotation applied, `createImageBitmap`'s own
 * default); `null` where the browser cannot measure at all — the server measures again. It throws for a file that is no
 * picture the browser can read.
 */
export async function measureImageFile(file: Blob): Promise<ImageSize | null> {
	if (typeof createImageBitmap !== 'function') return null;
	const bitmap = await createImageBitmap(file);
	const size = { width: bitmap.width, height: bitmap.height };
	bitmap.close?.();
	return size;
}

/**
 * 🔴 U-65.6: a picked file against its rules, in the order that costs least — the type the browser names, then the
 * weight, then the pixels (the one that reads the file). A file that cannot be read as a picture is not of the types.
 * The first failure is the answer; `null` is a file that may be sent (the server checks all of it again).
 */
export async function checkImageFile(
	file: File,
	rules: ImageFileRules,
	measure: (file: Blob) => Promise<ImageSize | null> = measureImageFile
): Promise<ImageFileIssue | null> {
	if (!rules.types.includes(file.type.toLowerCase())) return 'type';
	if (file.size > rules.maxBytes) return 'size';
	let size: ImageSize | null;
	try {
		size = await measure(file);
	} catch {
		return 'type';
	}
	if (size && (size.width < rules.minWidth || size.height < rules.minHeight)) return 'dimensions';
	return null;
}

/** A file as the `data:<type>;base64,…` text a JSON body carries. */
export function readAsDataUri(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result);
			else reject(new Error('The file was not read as text'));
		};
		reader.onerror = () => reject(reader.error ?? new Error('The file was not read'));
		reader.readAsDataURL(file);
	});
}

/**
 * A stored picture, loaded so that a canvas may read its pixels: asked for without the cookies and with CORS
 * (`crossOrigin = 'anonymous'`), or the canvas it is drawn on could never be read back. It rejects when the picture
 * does not load — also when its host does not allow the page's origin.
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.decoding = 'async';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error('The picture did not load'));
		image.src = url;
	});
}

/** The shape of a cut (`aspect` = width / height) and the least it may hold in the picture's own pixels. */
export type ImageCropRules = { aspect: number; minWidth: number; minHeight: number };

/**
 * What the person chose: how far in (`1` the largest cut of the shape the picture holds) and the cut's middle, each a
 * fraction of the picture's width and height.
 */
export type ImageCrop = { zoom: number; x: number; y: number };

/** The cut in the picture's own pixels, whole numbers, always inside the picture. */
export type ImageCropRect = { x: number; y: number; width: number; height: number };

/** The middle of a picture's side, as the fraction of it a choice keeps. */
const MIDDLE = 1 / 2;

/** The cut a picture opens with: the largest of the shape, in the middle. */
export const CENTRED_IMAGE_CROP: ImageCrop = { zoom: 1, x: MIDDLE, y: MIDDLE };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The largest cut of the shape the picture holds. */
function fullCut(source: ImageSize, aspect: number): ImageSize {
	return source.width / source.height >= aspect
		? { width: source.height * aspect, height: source.height }
		: { width: source.width, height: source.width / aspect };
}

/**
 * How far in the cut may go before it holds fewer pixels than the least allowed (`1`: no room at all, the largest cut is
 * the only one); `null` for a picture too small for even that — nothing may be cut of it.
 */
export function maxImageCropZoom(source: ImageSize, rules: ImageCropRules): number | null {
	if (source.width <= 0 || source.height <= 0) return null;
	const full = fullCut(source, rules.aspect);
	const zoom = Math.min(full.width / rules.minWidth, full.height / rules.minHeight);
	return zoom >= 1 ? zoom : null;
}

/**
 * 🔴 D-W52-40: the chosen cut in the picture's pixels — of the shape, never larger than the picture, never fewer pixels
 * than the least allowed (while the picture has them), and moved back inside whenever its middle would take it over an
 * edge. A zoom out of range is read as the nearest end.
 */
export function imageCropRect(
	source: ImageSize,
	rules: ImageCropRules,
	crop: ImageCrop
): ImageCropRect {
	const full = fullCut(source, rules.aspect);
	const zoom = clamp(
		Number.isFinite(crop.zoom) ? crop.zoom : 1,
		1,
		maxImageCropZoom(source, rules) ?? 1
	);
	const width = Math.min(source.width, Math.max(rules.minWidth, Math.round(full.width / zoom)));
	const height = Math.min(source.height, Math.max(rules.minHeight, Math.round(full.height / zoom)));
	const middle = (fraction: number, side: number) =>
		(Number.isFinite(fraction) ? fraction : MIDDLE) * side;
	return {
		x: clamp(Math.round(middle(crop.x, source.width) - width / 2), 0, source.width - width),
		y: clamp(Math.round(middle(crop.y, source.height) - height / 2), 0, source.height - height),
		width,
		height
	};
}

/**
 * A choice as the picture allows it: the zoom inside its range, and the middle moved only as far as it must be for the
 * cut to stay inside the picture — a middle that already fits is kept exactly, so a run of small steps never drifts.
 */
export function clampImageCrop(
	source: ImageSize,
	rules: ImageCropRules,
	crop: ImageCrop
): ImageCrop {
	const full = fullCut(source, rules.aspect);
	const zoom = clamp(
		Number.isFinite(crop.zoom) ? crop.zoom : 1,
		1,
		maxImageCropZoom(source, rules) ?? 1
	);
	const half = (cut: number, least: number, side: number) =>
		Math.min(side, Math.max(least, cut / zoom)) / 2 / side;
	const halfWidth = half(full.width, rules.minWidth, source.width);
	const halfHeight = half(full.height, rules.minHeight, source.height);
	return {
		zoom,
		x: clamp(Number.isFinite(crop.x) ? crop.x : MIDDLE, halfWidth, 1 - halfWidth),
		y: clamp(Number.isFinite(crop.y) ? crop.y : MIDDLE, halfHeight, 1 - halfHeight)
	};
}

/**
 * The choice after the picture is pushed by (`dx`, `dy`), each a fraction of the FRAME that shows the cut: pushing the
 * picture right shows what was on its left, so the cut moves the other way — and stops at the picture's edges.
 */
export function panImageCrop(
	source: ImageSize,
	rules: ImageCropRules,
	crop: ImageCrop,
	dx: number,
	dy: number
): ImageCrop {
	const rect = imageCropRect(source, rules, crop);
	return clampImageCrop(source, rules, {
		zoom: crop.zoom,
		x: (rect.x + rect.width / 2 - dx * rect.width) / source.width,
		y: (rect.y + rect.height / 2 - dy * rect.height) / source.height
	});
}

/**
 * 🔴 D-W52-40: the cut as a JPEG, made on this device — as many pixels as the cut holds in the picture, never more (no
 * picture is made larger than it is). It throws when the canvas cannot be read (a picture loaded without CORS).
 */
export function cutImageToJpeg(
	image: CanvasImageSource,
	rect: ImageCropRect,
	quality = 0.9
): string {
	const canvas = document.createElement('canvas');
	canvas.width = rect.width;
	canvas.height = rect.height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('The canvas cannot draw');
	context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
	return canvas.toDataURL('image/jpeg', quality);
}
