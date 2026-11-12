/**
 * U-84.5: hands a file over to the browser (a conversation's copy, an appointment's `.ics`). The words reach only the
 * file: the `blob:` address holds no text and is revoked at once, and nothing of it stays in the page. The caller names
 * the file by a date, never by a person.
 */
export function saveFile(blob: Blob, fileName: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
