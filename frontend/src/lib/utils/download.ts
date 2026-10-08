/**
 * Hands a same-origin URL to the browser's download manager. An `<a download>`
 * lets the server's Content-Disposition name the file and streams it straight
 * to disk, instead of buffering the whole body in memory as a Blob.
 */
export function downloadUrl(url: string, filename = ""): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
  }
}
