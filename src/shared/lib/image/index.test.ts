import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	CENTRED_IMAGE_CROP,
	checkImageFile,
	clampImageCrop,
	cutImageToJpeg,
	imageCropRect,
	loadImage,
	maxImageCropZoom,
	measureImageFile,
	panImageCrop,
	readAsDataUri,
	type ImageFileRules
} from '.';

const RULES: ImageFileRules = {
	types: ['image/jpeg', 'image/png', 'image/webp'],
	maxBytes: 1000,
	minWidth: 800,
	minHeight: 600
};
const CUT = { aspect: 4 / 3, minWidth: 800, minHeight: 600 };

const file = (type: string, bytes = 10, name = 'photo') =>
	new File([new Uint8Array(bytes)], name, { type });
const sized = (width: number, height: number) => async () => ({ width, height });

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('a picked picture before it is sent (wave 5.2, D-W52-38)', () => {
	it('🔴 D-W52-38: a JPG, a PNG or a WebP of the weight and the pixels passes; the type is read without its case', async () => {
		for (const type of ['image/jpeg', 'image/png', 'image/webp', 'IMAGE/JPEG']) {
			expect(await checkImageFile(file(type), RULES, sized(800, 600))).toBeNull();
		}
		expect(await checkImageFile(file('image/png', 1000), RULES, sized(4000, 3000))).toBeNull();
	});

	it('🔴 D-W52-38 (negative): another type, a heavier file and fewer pixels are each refused with their own reason — the first that fails, in the order type · weight · pixels', async () => {
		const measure = vi.fn(sized(800, 600));
		for (const type of ['image/gif', 'image/heic', 'image/svg+xml', 'application/pdf', '']) {
			expect(await checkImageFile(file(type), RULES, measure)).toBe('type');
		}
		expect(await checkImageFile(file('image/png', 1001), RULES, measure)).toBe('size');
		expect(await checkImageFile(file('image/gif', 1001), RULES, measure)).toBe('type');
		// Neither a wrong type nor a heavy file is ever opened to be measured.
		expect(measure).not.toHaveBeenCalled();
		for (const [width, height] of [
			[799, 600],
			[800, 599],
			[600, 800],
			[1, 1]
		]) {
			expect(await checkImageFile(file('image/jpeg'), RULES, sized(width, height))).toBe(
				'dimensions'
			);
		}
	});

	it('🔴 U-65.6 (negative): a file that only CLAIMS to be a picture is not of the types; a browser that cannot measure leaves the pixels to the server', async () => {
		const broken = async () => {
			throw new Error('not a picture');
		};
		expect(await checkImageFile(file('image/png'), RULES, broken)).toBe('type');
		expect(await checkImageFile(file('image/png'), RULES, async () => null)).toBeNull();
	});

	it('the pixels are the browser’s own read of the file, and the bitmap is given back', async () => {
		const close = vi.fn();
		const bitmap = vi.fn(async () => ({ width: 1200, height: 900, close }));
		vi.stubGlobal('createImageBitmap', bitmap);
		const picked = file('image/png');
		expect(await measureImageFile(picked)).toEqual({ width: 1200, height: 900 });
		expect(bitmap).toHaveBeenCalledWith(picked);
		expect(close).toHaveBeenCalledOnce();
		vi.stubGlobal('createImageBitmap', undefined);
		expect(await measureImageFile(picked)).toBeNull();
	});

	it('a file is read as the `data:` text a JSON body carries', async () => {
		const text = await readAsDataUri(new Blob(['abc'], { type: 'image/png' }));
		expect(text).toBe('data:image/png;base64,YWJj');
	});
});

describe('the part of a picture that is kept (wave 5.2, D-W52-40)', () => {
	const stored = { width: 1200, height: 900 };

	it('🔴 D-W52-40: a picture opens with the largest cut of the shape, in its middle — the whole of a 4:3 one, the middle of a wide or a tall one', () => {
		expect(imageCropRect(stored, CUT, CENTRED_IMAGE_CROP)).toEqual({
			x: 0,
			y: 0,
			width: 1200,
			height: 900
		});
		expect(imageCropRect({ width: 2000, height: 900 }, CUT, CENTRED_IMAGE_CROP)).toEqual({
			x: 400,
			y: 0,
			width: 1200,
			height: 900
		});
		expect(imageCropRect({ width: 900, height: 1600 }, CUT, CENTRED_IMAGE_CROP)).toEqual({
			x: 0,
			y: 463,
			width: 900,
			height: 675
		});
	});

	it('🔴 D-W52-40: the cut never holds fewer than 800 × 600 — the zoom ends where it would, and a picture of exactly that has no room', () => {
		expect(maxImageCropZoom(stored, CUT)).toBe(1.5);
		expect(maxImageCropZoom({ width: 800, height: 600 }, CUT)).toBe(1);
		expect(maxImageCropZoom({ width: 4000, height: 3000 }, CUT)).toBe(5);
		expect(imageCropRect(stored, CUT, { zoom: 1.5, x: 0.5, y: 0.5 })).toEqual({
			x: 200,
			y: 150,
			width: 800,
			height: 600
		});
		// Past the end, below the start, not a number: the nearest end.
		expect(imageCropRect(stored, CUT, { zoom: 9, x: 0.5, y: 0.5 })).toMatchObject({
			width: 800,
			height: 600
		});
		for (const zoom of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(imageCropRect(stored, CUT, { zoom, x: 0.5, y: 0.5 })).toMatchObject({
				width: 1200,
				height: 900
			});
		}
	});

	it('🔴 D-W52-40 (negative): a picture under 800 × 600 in the shape cannot be cut at all', () => {
		for (const source of [
			{ width: 799, height: 600 },
			{ width: 800, height: 599 },
			{ width: 600, height: 800 },
			{ width: 0, height: 0 }
		]) {
			expect(maxImageCropZoom(source, CUT)).toBeNull();
		}
	});

	it('🔴 D-W52-40: the cut stays inside the picture — a middle pushed over an edge stops at the edge', () => {
		const inside = { zoom: 1.5, x: 0.5, y: 0.5 };
		expect(imageCropRect(stored, CUT, { ...inside, x: 0, y: 0 })).toMatchObject({ x: 0, y: 0 });
		expect(imageCropRect(stored, CUT, { ...inside, x: 1, y: 1 })).toMatchObject({ x: 400, y: 300 });
		expect(imageCropRect(stored, CUT, { ...inside, x: -5, y: 7 })).toMatchObject({ x: 0, y: 300 });
		expect(imageCropRect(stored, CUT, { ...inside, x: Number.NaN, y: 0.5 })).toMatchObject({
			x: 200
		});
		const pulled = clampImageCrop(stored, CUT, { zoom: 4, x: 2, y: -1 });
		expect(pulled.zoom).toBe(1.5);
		expect(pulled.x).toBeCloseTo(800 / 1200, 10);
		expect(pulled.y).toBeCloseTo(300 / 900, 10);
		// A middle that already fits is kept exactly: a run of small steps never drifts.
		expect(clampImageCrop(stored, CUT, { zoom: 1.05, x: 0.5, y: 0.5 })).toEqual({
			zoom: 1.05,
			x: 0.5,
			y: 0.5
		});
	});

	it('D-W52-40: pushing the picture right shows what was on its left, by the frame’s own measure, and stops at the edges', () => {
		const start = { zoom: 1.5, x: 0.5, y: 0.5 };
		// A quarter of the frame = a quarter of the cut's 800 pixels.
		expect(imageCropRect(stored, CUT, panImageCrop(stored, CUT, start, 0.25, 0))).toMatchObject({
			x: 0,
			y: 150
		});
		expect(imageCropRect(stored, CUT, panImageCrop(stored, CUT, start, -0.125, 0.1))).toMatchObject(
			{ x: 300, y: 90 }
		);
		expect(imageCropRect(stored, CUT, panImageCrop(stored, CUT, start, -9, -9))).toMatchObject({
			x: 400,
			y: 300
		});
		// The largest cut of a 4:3 picture has nowhere to go.
		expect(panImageCrop(stored, CUT, CENTRED_IMAGE_CROP, 0.5, 0.5)).toEqual(CENTRED_IMAGE_CROP);
	});

	it('🔴 D-W52-40: the cut is drawn on the device as a JPEG of exactly its own pixels — never more than the picture has', () => {
		const drawImage = vi.fn();
		const toDataURL = vi.fn(() => 'data:image/jpeg;base64,CUT');
		const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toDataURL };
		const create = vi
			.spyOn(document, 'createElement')
			.mockReturnValue(canvas as unknown as HTMLCanvasElement);
		const image = {} as CanvasImageSource;
		const rect = { x: 200, y: 150, width: 800, height: 600 };
		expect(cutImageToJpeg(image, rect)).toBe('data:image/jpeg;base64,CUT');
		expect(create).toHaveBeenCalledWith('canvas');
		expect([canvas.width, canvas.height]).toEqual([800, 600]);
		expect(drawImage).toHaveBeenCalledWith(image, 200, 150, 800, 600, 0, 0, 800, 600);
		expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
	});

	it('(negative) a canvas that cannot draw, or cannot be read back, is an error — never a silent empty picture', () => {
		const tainted = {
			width: 0,
			height: 0,
			getContext: () => ({ drawImage: vi.fn() }),
			toDataURL: () => {
				throw new DOMException('tainted', 'SecurityError');
			}
		};
		const create = vi.spyOn(document, 'createElement');
		create.mockReturnValueOnce(tainted as unknown as HTMLCanvasElement);
		const rect = { x: 0, y: 0, width: 800, height: 600 };
		expect(() => cutImageToJpeg({} as CanvasImageSource, rect)).toThrow('tainted');
		create.mockReturnValueOnce({ getContext: () => null } as unknown as HTMLCanvasElement);
		expect(() => cutImageToJpeg({} as CanvasImageSource, rect)).toThrow();
	});

	it('D-W52-40: a stored picture is asked for with CORS and without the cookies, so the canvas may read it; one that does not load is an error', async () => {
		class FakeImage {
			static made: FakeImage[] = [];
			crossOrigin: string | null = null;
			decoding = '';
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			src = '';
			constructor() {
				FakeImage.made.push(this);
			}
		}
		vi.stubGlobal('Image', FakeImage);
		const loaded = loadImage('https://files.example/large/a.webp');
		const [first] = FakeImage.made;
		expect(first.crossOrigin).toBe('anonymous');
		expect(first.src).toBe('https://files.example/large/a.webp');
		first.onload?.();
		await expect(loaded).resolves.toBe(first);

		const refused = loadImage('https://files.example/large/b.webp');
		FakeImage.made[1].onerror?.();
		await expect(refused).rejects.toThrow();
	});
});
