# Spur direct-pitch derivation

Reference case: 32-tooth external spur gear, direct pitch confirmation from `m_t = 2.54 mm` or `P_d = 10`.

Formula sequence:
- `m_t = 2.54 mm` directly, or `m_t = 25.4 / 10 = 2.54 mm`
- `d = z m_t = 32 * 2.54 = 81.28 mm`
- `d_a = m_t (z + 2) = 2.54 * 34 = 86.36 mm`
- `p = pi m_t = pi * 2.54 = 7.979645340118075 mm`

Expected geometry:
- Transverse module: `2.54 mm`
- Transverse diametral pitch: `10`
- Pitch diameter: `81.28 mm`
- Outside diameter: `86.36 mm`
- Circular pitch: `7.979645340118075 mm`

Nominal shaft basis for the positive keyed/interference cases remains `25.4 mm`, so the fit expectations are identical to the replicate-from-OD case.
