// Eigener VR-Knopf (ohne Zusatzbibliothek).
export async function vrMoeglich() {
  if (!navigator.xr || !navigator.xr.isSessionSupported) return false;
  try { return await navigator.xr.isSessionSupported('immersive-vr'); } catch { return false; }
}

export async function starteVR(renderer) {
  const sitzung = await navigator.xr.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor', 'layers', 'hand-tracking']
  });
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(sitzung);
  return sitzung;
}
