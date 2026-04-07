# Helical direct-pitch derivation

Reference case: 24-tooth external helical gear, direct pitch confirmation from `m_t = 2.54 mm` or `P_d = 10`, helix angle `15 deg`.

Formula sequence:
- `m_t = 2.54 mm` directly, or `m_t = 25.4 / 10 = 2.54 mm`
- `m_n = m_t cos 15 deg = 2.4534515987742336 mm`
- `d = z m_t = 24 * 2.54 = 60.96 mm`
- `d_a = d + 2 m_n = 60.96 + 4.906903197548467 = 65.86690319754847 mm`
- `p_t = pi m_t = 7.979645340118075 mm`
- `p_n = pi m_n = 7.707745518647265 mm`
- `L = pi d / tan 15 deg = 714.7306040568213 mm`

Expected geometry:
- Transverse module: `2.54 mm`
- Normal module: `2.4534515987742336 mm`
- Transverse diametral pitch: `10`
- Pitch diameter: `60.96 mm`
- Outside diameter: `65.86690319754847 mm`
- Transverse circular pitch: `7.979645340118075 mm`
- Normal circular pitch: `7.707745518647265 mm`
- Lead: `714.7306040568213 mm`

Nominal shaft basis for the positive keyed/interference cases remains `31.75 mm`, so the fit expectations are identical to the replicate-from-OD helical case.
