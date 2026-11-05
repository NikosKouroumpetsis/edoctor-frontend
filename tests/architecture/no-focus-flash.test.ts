import { describe, expect, it } from 'vitest';
import { readSourceFiles } from './source-scan';

const FLASH_NAMES =
	/\b(?:animate-review-flash|animate-office-flash|review-flash|serviceFlash|endServiceFlash|data-flash)\b/;

describe('U-100: no focus flash', () => {
	it('U-100, the owner: nothing lights up on what a link or a choice lands on', () => {
		const offenders = readSourceFiles()
			.filter(
				(file) => !file.path.endsWith('no-focus-flash.test.ts') && FLASH_NAMES.test(file.text)
			)
			.map((file) => file.path);

		expect(offenders).toEqual([]);
	});
});
