import { afterEach, describe, expect, it } from 'vitest';
import { searchWords } from '$shared/lib/text';
import type { DoctorCard } from '$modules/search-doctors/types';
import {
	clampFavoritesSearch,
	FAVORITES_SEARCH_MAX,
	filterFavoriteCards,
	forgetPendingFavorite,
	takePendingFavorite,
	writePendingFavorite
} from '.';

const card = (id: string, name: string, specialty: string, area: string) =>
	({ id, name, specialty, area }) as DoctorCard;

const cards = [
	card('1', 'Dr. Maria Stefanou', 'Ψυχολόγος', 'Γλυφάδα'),
	card('2', 'Dr. Kostas Dimitriou', 'Καρδιολόγος', 'Αθήνα'),
	card('3', 'Dr. Athena Papadopoulou', 'Παθολόγος', 'Αθήνα')
];
const found = (query: string) =>
	filterFavoriteCards(cards, searchWords(query)).map((entry) => entry.id);

afterEach(() => {
	window.sessionStorage.clear();
});

describe('search-doctors::lib::favorites', () => {
	it('U-83.3: the FAQ’s rule over the name, the specialty and the area: accents, case and ς aside', () => {
		expect(found('καρδ')).toEqual(['2']);
		expect(found('ΚΑΡΔ')).toEqual(['2']);
		expect(found('καρδιολογος')).toEqual(['2']);
		expect(found('ΑΘΗΝΑ')).toEqual(['2', '3']);
		expect(found('maria')).toEqual(['1']);
		// `ς` = `σ`: the final sigma typed in the middle of a word.
		expect(found('ψυχολογοσ')).toEqual(['1']);
		expect(found('ψυχολόγος')).toEqual(['1']);
	});

	it('U-83.3: every word must be found, wherever', () => {
		expect(found('αθηνα παθ')).toEqual(['3']);
		expect(found('αθηνα ψυχ')).toEqual([]);
	});

	it('U-83.3: no words ⇒ every card, in the server’s order', () => {
		expect(found('   ')).toEqual(['1', '2', '3']);
	});

	it('U-65.6 (negative): the words are only ever text to compare: markup finds nothing and breaks nothing', () => {
		expect(found('<script>alert(1)</script>')).toEqual([]);
	});

	it('U-65.6 (negative): the code cuts at 100, whatever the attribute did', () => {
		expect(clampFavoritesSearch('α'.repeat(FAVORITES_SEARCH_MAX + 1))).toHaveLength(100);
		expect(clampFavoritesSearch('καρδ')).toBe('καρδ');
		// A letter outside the basic plane is one letter, never half of one.
		expect(Array.from(clampFavoritesSearch('😀'.repeat(101)))).toHaveLength(100);
	});

	it('U-80.1 Ε4: the doctor a heart asked for waits in the tab, and runs once', () => {
		const id = '019a0000-0000-7000-8000-000000000001';
		writePendingFavorite(id);
		expect(takePendingFavorite()).toBe(id);
		expect(takePendingFavorite()).toBeNull();
	});

	it('`w2-w3` §Ανοιχτά 2: the sign-in left unfinished takes the doctor out of the tab', () => {
		writePendingFavorite('019a0000-0000-7000-8000-000000000001');
		forgetPendingFavorite();
		expect(window.sessionStorage.getItem('edoctor.test.favorite-pending.v1')).toBeNull();
	});

	it('U-65.6 (negative): what is no id never comes out of the storage', () => {
		for (const value of ['<script>', '../../patient', 'not-an-id']) {
			window.sessionStorage.setItem('edoctor.test.favorite-pending.v1', value);
			expect(takePendingFavorite()).toBeNull();
		}
	});
});
