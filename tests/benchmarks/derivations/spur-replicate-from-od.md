# Spur replicate-from-od derivation

Reference case: 32-tooth external spur gear, outside diameter `86.36 mm`, nominal shaft size `25.4 mm`.

Formula sequence:
- `m_t = d_a / (z + 2) = 86.36 / 34 = 2.54 mm`
- `P_d = 25.4 / m_t = 25.4 / 2.54 = 10`
- `d = z m_t = 32 * 2.54 = 81.28 mm`
- `p = pi m_t = pi * 2.54 = 7.979645340118075 mm`

Expected geometry:
- Transverse module: `2.54 mm`
- Transverse diametral pitch: `10`
- Pitch diameter: `81.28 mm`
- Outside diameter: `86.36 mm`
- Circular pitch: `7.979645340118075 mm`

Keyed fit at nominal `25.4 mm` using the `18-30 mm` H7/h6 band:
- Bore minimum: `25.400 mm`
- Bore maximum: `25.421 mm`
- Clearance minimum: `0.000 mm`
- Clearance maximum: `0.034 mm`

Interference fit at nominal `25.4 mm` using the `18-30 mm` H7/s6 band:
- Bore minimum: `25.400 mm`
- Bore maximum: `25.421 mm`
- Interference minimum: `0.010 mm`
- Interference maximum: `0.044 mm`

Measured key evidence for the keyed benchmarks is `6.35 mm` width and `3.175 mm` hub depth, which matches the imperial key-table recommendation exactly.
