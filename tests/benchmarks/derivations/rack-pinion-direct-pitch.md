# Rack and pinion direct-pitch derivation

Reference case: 20-tooth pinion, direct pitch confirmation from `m_t = 3.175 mm` or `P_d = 8`.

Formula sequence:
- `m_t = 3.175 mm` directly, or `m_t = 25.4 / 8 = 3.175 mm`
- `d = z m_t = 20 * 3.175 = 63.5 mm`
- `d_a = m_t (z + 2) = 3.175 * 22 = 69.85 mm`
- `p = pi m_t = 9.974556675147593 mm`
- Rack linear pitch equals pinion circular pitch: `p_rack = 9.974556675147593 mm`

Expected geometry:
- Pinion transverse module: `3.175 mm`
- Pinion transverse diametral pitch: `8`
- Pinion pitch diameter: `63.5 mm`
- Pinion outside diameter: `69.85 mm`
- Pinion circular pitch: `9.974556675147593 mm`
- Rack linear pitch: `9.974556675147593 mm`

Nominal shaft basis for the positive keyed/interference cases remains `38.1 mm`, so the fit expectations are identical to the replicate-from-OD rack-and-pinion case.
