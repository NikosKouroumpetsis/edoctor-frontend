/**
 * U-84.5: hands a file over to the browser. The words reach only the file: the `blob:` address holds no text and is
 * revoked at once, and nothing of it stays in the page.
 */
export function saveTextFile(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

/** The copy's fixed name: a date, never a person. */
export function conversationCopyName(day: string): string {
	return `edoctor-messages-${day}.txt`;
}
