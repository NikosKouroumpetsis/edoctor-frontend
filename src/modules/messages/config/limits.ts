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
