/** Hands a URL to the browser's download manager through a hidden `<a download>`. */
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

/** Saves an in-memory file under `filename`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  // Revoked on a later tick: some browsers start reading the URL only after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
