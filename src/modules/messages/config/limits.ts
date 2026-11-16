/** U-84.6: the most a message holds, in code points, as the server counts (its own check stands whatever this says). */
export const MESSAGE_MAX_LENGTH = 2000;

/** U-84 Π2: the counter shows from 90 %. */
export const MESSAGE_COUNT_FROM = 1800;

/** U-84.7: an open conversation asks for what is new every 5 s. */
export const THREAD_POLL_MS = 5000;

/** U-84.7: the list and the badge on the pages of the messages. */
export const INBOX_POLL_MS = 30000;

/** U-84.7: the badge everywhere else. */
export const BADGE_POLL_MS = 60000;

/** 🔴 D-W51-80 (U-65.6): the doctor's search of its conversations — the most a name holds, as the server's own check. */
export const MESSAGES_SEARCH_MAX_LENGTH = 40;

/** D-W51-86: the search asks after this much quiet in the field (the application's 500 ms). */
export const MESSAGES_SEARCH_DEBOUNCE_MS = 500;

/** 🔴 U-65.6 (D-W51-79): the most of a name, and of a relationship's word, that the appointment's line keeps. */
export const APPOINTMENT_LINE_NAME_MAX = 80;
export const APPOINTMENT_LINE_RELATION_MAX = 32;
