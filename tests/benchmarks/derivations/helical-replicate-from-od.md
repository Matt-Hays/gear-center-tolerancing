# Helical replicate-from-od derivation

Reference case: 24-tooth external helical gear, outside diameter `65.86690319754847 mm`, helix angle `15 deg`, nominal shaft `31.75 mm`.

Formula sequence:
- `cos beta = cos 15 deg = 0.9659258262890683`
- `m_t = d_a / (z + 2 cos beta) = 65.86690319754847 / (24 + 1.9318516525781366) = 2.54 mm`
- `m_n = m_t cos beta = 2.54 * 0.9659258262890683 = 2.4534515987742336 mm`
- `P_d = 25.4 / m_t = 10`
- `d = z m_t = 24 * 2.54 = 60.96 mm`
- `d_a = d + 2 m_n = 60.96 + 4.906903197548467 = 65.86690319754847 mm`
- `p_t = pi m_t = 7.979645340118075 mm`
- `p_n = pi m_n = 7.707745518647265 mm`
- `L = pi d / tan beta = pi * 60.96 / tan 15 deg = 714.7306040568213 mm`

Expected geometry:
- Transverse module: `2.54 mm`
- Normal module: `2.4534515987742336 mm`
- Transverse diametral pitch: `10`
- Pitch diameter: `60.96 mm`
- Outside diameter: `65.86690319754847 mm`
- Transverse circular pitch: `7.979645340118075 mm`
- Normal circular pitch: `7.707745518647265 mm`
- Lead: `714.7306040568213 mm`

Keyed fit at nominal `31.75 mm` using the `30-50 mm` H7/h6 band:
- Bore minimum: `31.750 mm`
- Bore maximum: `31.775 mm`
- Clearance minimum: `0.000 mm`
- Clearance maximum: `0.041 mm`

Interference fit at nominal `31.75 mm` using the `30-50 mm` H7/s6 band:
- Bore minimum: `31.750 mm`
- Bore maximum: `31.775 mm`
- Interference minimum: `0.013 mm`
- Interference maximum: `0.054 mm`

Measured key evidence for the keyed benchmarks is `6.35 mm` width and `3.175 mm` hub depth, matching the imperial key table.
