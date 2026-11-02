import { describe, expect, it } from 'vitest';
import { m } from '$paraglide/messages.js';
import { deletionSectionIds, emphasizeNames, splitDuration } from '.';

const locales = ['el', 'en'] as const;

describe('account::lib::deletion', () => {
	it('U-62.1 (the prototype 10, Π3): the application’s names are bold inside the step, the sentence’s words unchanged', () => {
		const runs = emphasizeNames('Πατήστε Προφίλ → Ρυθμίσεις λογαριασμού → Διαγραφή λογαριασμού.', [
			'Προφίλ',
			'Ρυθμίσεις λογαριασμού',
			'Διαγραφή λογαριασμού'
		]);
		expect(runs).toEqual([
			{ text: 'Πατήστε ', strong: false },
			{ text: 'Προφίλ', strong: true },
			{ text: ' → ', strong: false },
			{ text: 'Ρυθμίσεις λογαριασμού', strong: true },
			{ text: ' → ', strong: false },
			{ text: 'Διαγραφή λογαριασμού', strong: true },
			{ text: '.', strong: false }
		]);
		expect(emphasizeNames('Χωρίς όνομα.', ['Προφίλ'])).toEqual([
			{ text: 'Χωρίς όνομα.', strong: false }
		]);
	});

	it('U-62.1 (app = web): every bold name is a word of its step, in both languages', () => {
		for (const locale of locales) {
			const options = { locale };
			const path = m.account_deletion_app_step_path({}, options);
			for (const name of [
				m.account_deletion_app_name_profile({}, options),
				m.account_deletion_app_name_settings({}, options),
				m.account_deletion_app_name_delete({}, options)
			])
				expect(path, `${locale}: ${name}`).toContain(name);
			expect(m.account_deletion_app_step_review({}, options)).toContain(
				m.account_deletion_app_name_send({}, options)
			);
			expect(m.account_deletion_app_step_code({}, options)).toContain(
				m.account_deletion_app_name_confirm({}, options)
			);
		}
	});

	it('U-62.1 (negative): «Η διαγραφή είναι οριστική» is MOVED from the introduction to the notice — the same words once, never twice', () => {
		for (const locale of locales) {
			const options = { locale };
			const intro = m.account_deletion_intro({}, options);
			const final = `${m.account_deletion_final_title({}, options)} ${m.account_deletion_final_body({}, options)}`;
			expect(intro).not.toContain(m.account_deletion_final_title({}, options));
			expect(intro).not.toContain(m.account_deletion_final_body({}, options));
			expect(`${intro} ${final}`).toBe(
				locale === 'el'
					? 'Μπορείτε να διαγράψετε τον λογαριασμό σας στην εφαρμογή eDoctor οποτεδήποτε: από την ίδια την εφαρμογή ή με αίτημα στην υποστήριξη. Η διαγραφή είναι οριστική: ο λογαριασμός δεν επανέρχεται και δεν μπορείτε να συνδεθείτε ξανά σε αυτόν.'
					: 'You may delete your account in the eDoctor app at any time: from the app itself or by a request to support. The deletion is final: the account cannot be restored and you cannot sign in to it again.'
			);
		}
	});

	it('U-62.2 Ε1: «Διάρκεια:» is the line’s bold label, the rest the same words', () => {
		expect(splitDuration('Διάρκεια: 10 χρόνια από την τελευταία σας επίσκεψη.')).toEqual({
			label: 'Διάρκεια:',
			rest: '10 χρόνια από την τελευταία σας επίσκεψη.'
		});
		expect(splitDuration('Χωρίς ετικέτα')).toEqual({ label: '', rest: 'Χωρίς ετικέτα' });
	});

	it('U-62.1 Π4: the four H2s at their anchors, in order', () => {
		expect(deletionSectionIds).toEqual([
			'from-the-app',
			'without-the-app',
			'deleted-at-once',
			'what-we-keep'
		]);
	});
});
