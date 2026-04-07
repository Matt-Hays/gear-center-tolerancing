# Rack and pinion replicate-from-od derivation

Reference case: 20-tooth pinion, outside diameter `69.85 mm`, nominal shaft `38.1 mm`.

Formula sequence:
- `m_t = d_a / (z + 2) = 69.85 / 22 = 3.175 mm`
- `P_d = 25.4 / m_t = 25.4 / 3.175 = 8`
- `d = z m_t = 20 * 3.175 = 63.5 mm`
- `p = pi m_t = pi * 3.175 = 9.974556675147593 mm`
- Rack linear pitch equals pinion circular pitch for the matched rack: `p_rack = 9.974556675147593 mm`

Expected geometry:
- Pinion transverse module: `3.175 mm`
- Pinion transverse diametral pitch: `8`
- Pinion pitch diameter: `63.5 mm`
- Pinion outside diameter: `69.85 mm`
- Pinion circular pitch: `9.974556675147593 mm`
- Rack linear pitch: `9.974556675147593 mm`

Keyed fit at nominal `38.1 mm` using the `30-50 mm` H7/h6 band:
- Bore minimum: `38.100 mm`
- Bore maximum: `38.125 mm`
- Clearance minimum: `0.000 mm`
- Clearance maximum: `0.041 mm`

Interference fit at nominal `38.1 mm` using the `30-50 mm` H7/s6 band:
- Bore minimum: `38.100 mm`
- Bore maximum: `38.125 mm`
- Interference minimum: `0.013 mm`
- Interference maximum: `0.054 mm`

Measured key evidence for the keyed benchmarks is `9.525 mm` width and `4.7752 mm` hub depth, matching the imperial key table.
