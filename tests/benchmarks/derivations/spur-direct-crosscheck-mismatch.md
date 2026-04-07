# Spur direct-pitch cross-check mismatch derivation

This edge case uses the same governing spur solution as the positive direct-pitch benchmark:
- Tooth count: `32`
- Governing module: `2.54 mm`
- Governing pitch diameter: `81.28 mm`
- Governing outside diameter: `86.36 mm`

Intentional cross-check mismatches:
- Entered diametral pitch: `9.5` instead of `10`
- Entered outside diameter: `90 mm` instead of `86.36 mm`
- Entered pitch diameter: `85 mm` instead of `81.28 mm`

Expected behavior:
- Geometry still solves from the governing module input.
- Status drops to `draft`.
- Issues raised:
  - `diametral-pitch-crosscheck-mismatch`
  - `outside-diameter-crosscheck-mismatch`
  - `pitch-diameter-crosscheck-mismatch`

The keyed recommendation still uses the same `25.4 mm` nominal fit band and the same imperial key dimensions because the measured key evidence is unchanged.
