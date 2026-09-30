/** Triggers a browser download of `content` as a file named `fileName`.
 * Client-only (uses the DOM); call it from an event handler. */
export function downloadTextFile(fileName: string, content: string, mimeType = "application/json"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has already started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
