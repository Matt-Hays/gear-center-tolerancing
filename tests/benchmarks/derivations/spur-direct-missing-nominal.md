# Spur direct-pitch missing nominal derivation

This edge case uses the positive spur direct-pitch geometry but omits the confirmed nominal shaft size.

Known measurements:
- Tooth count: `32`
- Diametral pitch: `10`
- Outside diameter: `86.36 mm`
- Pitch diameter: `81.28 mm`
- Measured shaft diameter: `25.39746 mm` (`0.9999 in`)

Nominal suggestion rule for imperial projects:
- Convert shaft size to inches: `25.39746 / 25.4 = 0.9999 in`
- Round to nearest sixteenth: `1.0000 in`
- Convert back to canonical mm: `25.4 mm`

Expected behavior:
- Geometry still solves correctly.
- A provisional keyed recommendation is still computed from the suggested `25.4 mm` nominal size.
- Status remains `blocked` because the required `nominalShaftSize` field is missing.
- Issue raised: `nominal-size-suggested`
