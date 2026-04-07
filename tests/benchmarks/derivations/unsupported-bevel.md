# Unsupported bevel family handling

This case exists to prove that unsupported gear families are blocked explicitly rather than approximated.

Expected behavior:
- The project may still include otherwise valid measurements.
- The engine must not dispatch to a spur, helical, or rack-and-pinion solver.
- Status must be `blocked`.
- Issue raised: `unsupported-combination`
- No tolerance recommendation is emitted.
