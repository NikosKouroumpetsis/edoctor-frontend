import { describe, expect, it } from 'vitest';
import {
	conversationCopyName,
	conversationTimeLabel,
	messageClock,
	messageDay,
	messageDayLabel
} from '.';

const NOW = Date.UTC(2026, 10, 3, 16, 40); // Tue 3 Nov 2026, 18:40 in Athens
const at = (month: number, day: number, hour: number, minute = 0) =>
	Date.UTC(2026, month - 1, day, hour, minute);

describe('the messages’ times (U-84 Π1, Π2)', () => {
	it('the clock is the platform’s', () => {
		expect(messageClock(at(11, 3, 12, 32))).toBe('14:32');
	});

	it('the list: today the time, «Χθες», the weekday, the date', () => {
		expect(conversationTimeLabel(at(11, 3, 12, 32), NOW, 'el')).toBe('14:32');
		expect(conversationTimeLabel(at(11, 2, 12), NOW, 'el')).toBe('Χθες');
		expect(conversationTimeLabel(at(11, 2, 12), NOW, 'en')).toBe('Yesterday');
		expect(conversationTimeLabel(at(11, 1, 12), NOW, 'el')).toBe('Κυρ');
		expect(conversationTimeLabel(at(10, 28, 12), NOW, 'en')).toBe('Wed');
		expect(conversationTimeLabel(at(9, 30, 12), NOW, 'el')).toBe('30/9');
		expect(conversationTimeLabel(at(9, 30, 12), NOW, 'en')).toBe('Sep 30');
	});

	it('a minute past Greek midnight is the next day, whatever the device’s zone', () => {
		const justAfter = Date.UTC(2026, 10, 2, 22, 1); // 00:01 on the 3rd in Athens
		expect(conversationTimeLabel(justAfter, NOW, 'el')).toBe('00:01');
	});

	it('over the messages: «Σήμερα», «Χθες», the whole day, the year when it is another', () => {
		expect(messageDayLabel(at(11, 3, 12), NOW, 'el')).toBe('Σήμερα');
		expect(messageDayLabel(at(11, 2, 12), NOW, 'el')).toBe('Χθες');
		expect(messageDayLabel(at(10, 28, 12), NOW, 'el')).toMatch(/^Τετάρτη 28 Οκτωβρίου$/u);
		expect(messageDayLabel(Date.UTC(2025, 9, 28, 12), NOW, 'el')).toContain('2025');
	});

	it('U-84.5: the copy is named by the day it is taken, on the platform’s calendar — a date, never a person', () => {
		const justAfter = Date.UTC(2026, 10, 2, 22, 1); // 00:01 on the 3rd in Athens
		expect(conversationCopyName(messageDay(justAfter))).toBe('edoctor-messages-2026-11-03.txt');
		expect(conversationCopyName(messageDay(NOW))).toMatch(
			/^edoctor-messages-\d{4}-\d{2}-\d{2}\.txt$/u
		);
	});
});
