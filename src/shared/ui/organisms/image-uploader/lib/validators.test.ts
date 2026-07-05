import { describe, expect, it } from 'vitest';
import { ImageValidators, runImageValidators } from './validators';
import type { ImageMeta } from './types';

function file(name: string, type: string, sizeBytes = 4): File {
	return new File(['x'.repeat(sizeBytes)], name, { type });
}

describe('ImageValidators.accept', () => {
	it('passes an exact MIME match and rejects others with code "accept"', () => {
		const v = ImageValidators.accept(['image/png']);
		expect(v(file('a.png', 'image/png'), {})).toBeNull();
		expect(v(file('a.gif', 'image/gif'), {})).toMatchObject({ code: 'accept' });
	});

	it('supports wildcard MIME (image/*)', () => {
		const v = ImageValidators.accept(['image/*']);
		expect(v(file('a.webp', 'image/webp'), {})).toBeNull();
		expect(v(file('a.pdf', 'application/pdf'), {})).toMatchObject({ code: 'accept' });
	});

	it('supports extension tokens (.png)', () => {
		const v = ImageValidators.accept(['.png']);
		expect(v(file('PHOTO.PNG', ''), {})).toBeNull();
		expect(v(file('a.jpg', ''), {})).toMatchObject({ code: 'accept' });
	});
});

describe('ImageValidators size', () => {
	it('maxSize rejects files above the byte limit', () => {
		const v = ImageValidators.maxSize(3);
		expect(v(file('a.png', 'image/png', 2), {})).toBeNull();
		expect(v(file('a.png', 'image/png', 10), {})).toMatchObject({ code: 'maxSize' });
	});

	it('minSize rejects files below the byte limit', () => {
		const v = ImageValidators.minSize(5);
		expect(v(file('a.png', 'image/png', 10), {})).toBeNull();
		expect(v(file('a.png', 'image/png', 2), {})).toMatchObject({ code: 'minSize' });
	});
});

describe('ImageValidators dimensions', () => {
	const big: ImageMeta = { width: 1200, height: 800 };
	const small: ImageMeta = { width: 100, height: 80 };

	it('minDimensions rejects images below the minimum', () => {
		const v = ImageValidators.minDimensions(200, 200);
		expect(v(file('a.png', 'image/png'), big)).toBeNull();
		expect(v(file('a.png', 'image/png'), small)).toMatchObject({ code: 'minDimensions' });
	});

	it('maxDimensions rejects images above the maximum', () => {
		const v = ImageValidators.maxDimensions(1000, 1000);
		expect(v(file('a.png', 'image/png'), small)).toBeNull();
		expect(v(file('a.png', 'image/png'), big)).toMatchObject({ code: 'maxDimensions' });
	});

	it('skips dimension checks when the decode produced no dimensions', () => {
		expect(ImageValidators.minDimensions(200, 200)(file('a.png', 'image/png'), {})).toBeNull();
		expect(ImageValidators.maxDimensions(100, 100)(file('a.png', 'image/png'), {})).toBeNull();
	});
});

describe('ImageValidators.aspectRatio', () => {
	it('passes within tolerance and rejects outside it', () => {
		const v = ImageValidators.aspectRatio(1, 0.05);
		expect(v(file('a.png', 'image/png'), { width: 100, height: 100 })).toBeNull();
		expect(v(file('a.png', 'image/png'), { width: 100, height: 50 })).toMatchObject({
			code: 'aspectRatio'
		});
	});
});

describe('runImageValidators', () => {
	it('collects every failing issue (sync + async)', async () => {
		const asyncMin: ReturnType<typeof ImageValidators.minSize> = async (f, m) =>
			ImageValidators.minSize(100)(f, m);
		const issues = await runImageValidators(file('a.gif', 'image/gif', 2), {}, [
			ImageValidators.accept(['image/png']),
			asyncMin
		]);
		expect(issues.map((i) => i.code).sort()).toEqual(['accept', 'minSize']);
	});

	it('returns an empty array when everything passes', async () => {
		const issues = await runImageValidators(
			file('a.png', 'image/png', 4),
			{ width: 10, height: 10 },
			[
				ImageValidators.accept(['image/*']),
				ImageValidators.maxSize(10),
				ImageValidators.minDimensions(5, 5)
			]
		);
		expect(issues).toEqual([]);
	});
});
