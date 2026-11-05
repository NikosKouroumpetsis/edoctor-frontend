import { describe, expect, it } from 'vitest';
import { buildLegalAcceptance } from '.';

describe('auth::lib::legal-acceptance', () => {
	it('every document at the version read', () => {
		expect(
			buildLegalAcceptance([
				{ documentCode: 'CORE_TERMS_OF_USE', version: '3' },
				{ documentCode: 'CORE_PRIVACY_POLICY', version: '2' }
			])
		).toEqual({
			context: 'PATIENT',
			acceptances: [
				{ accepted: true, documentCode: 'CORE_TERMS_OF_USE', version: '3' },
				{ accepted: true, documentCode: 'CORE_PRIVACY_POLICY', version: '2' }
			]
		});
	});

	it('(negative) a document without a version, or none at all, is no acceptance', () => {
		expect(
			buildLegalAcceptance([
				{ documentCode: 'CORE_TERMS_OF_USE', version: '3' },
				{ documentCode: 'CORE_PRIVACY_POLICY', version: null }
			])
		).toBeNull();
		expect(buildLegalAcceptance([])).toBeNull();
	});
});
