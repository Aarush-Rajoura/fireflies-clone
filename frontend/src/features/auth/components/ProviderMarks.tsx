// Drawn stand-ins for sign-in providers: generic shapes in our palette, not their logos.

export function GoogleMark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-4 items-center justify-center rounded-full border-2 border-avatar-1 text-micro text-primary"
    >
      G
    </span>
  );
}

export function MicrosoftMark() {
  return (
    <span aria-hidden className="grid size-4 grid-cols-2 gap-px">
      <span className="bg-avatar-0" />
      <span className="bg-avatar-3" />
      <span className="bg-avatar-1" />
      <span className="bg-avatar-5" />
    </span>
  );
}
