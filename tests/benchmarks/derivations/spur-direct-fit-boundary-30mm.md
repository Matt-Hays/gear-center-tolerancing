# Spur direct-pitch fit-boundary derivation at 30 mm

Reference case:
- Tooth count: `20`
- Governing module: `3 mm`
- Nominal shaft size: `30 mm`

Geometry:
- `d = z m_t = 20 * 3 = 60 mm`
- `d_a = m_t (z + 2) = 3 * 22 = 66 mm`
- `P_d = 25.4 / 3 = 8.466666666666667`
- `p = pi * 3 = 9.42477796076938 mm`

Boundary fit selection:
- The built-in fit-band lookup is inclusive, so `30.000 mm` resolves to the `18-30 mm` band before the `30-50 mm` band.
- For H7/s6 in the `18-30 mm` band:
  - Hole limits: `0 / +21 um`
  - Shaft limits: `+31 / +44 um`

Expected recommendation:
- Bore minimum: `30.000 mm`
- Bore maximum: `30.021 mm`
- Interference minimum: `0.010 mm`
- Interference maximum: `0.044 mm`
