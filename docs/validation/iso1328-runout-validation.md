# Centering Standards Validation Packet

## Status

- Validation status: `Provisional`
- Released mode: `Standards plus reserve budget`
- Active standards basis: `ISO 1328-1:2013 / ANSI/AGMA ISO 1328-1-B14`
- Inspection-method guidance: `ISO/TR 10064-1:2019 / AGMA ISO 10064-1-A21`
- Approved internal center-tolerance method: `Explicit reserve-budget worksheet`
- Second-engineer signoff against purchased/internal extract: `Pending`

The app now reports two distinct quantities:

- `Allowable ISO runout FrT`
- `Allowable center tolerance (TIR)`

`FrT` is the normative standards quantity. The allowable center tolerance is an internal engineering result obtained by subtracting explicit TIR-equivalent reserve lines from `FrT`. It is not claimed to be a direct ISO output.

## Active Basis

- Basis ID: `iso1328Part1Runout`
- Standard: `ISO 1328-1:2013 / ANSI/AGMA ISO 1328-1-B14`
- Quantity: `Allowable ISO runout FrT`
- Clause/equation reference carried in repo: `Controlled internal extract: Clause 5.3 / Annex E relationship with Clause 5.2.3 rounding`
- Inspection and setup guidance references:
  - `ISO/TR 10064-1:2019`
  - `AGMA ISO 10064-1-A21`
  - `ISO/TR 10064-2:1996`
  - `ISO/TR 10064-3:1996`
  - `AGMA 915-2-A05`
  - `AGMA 915-3-A99`

## Disabled Alternate Basis

- Basis ID: `iso1328Part2RadialRunout`
- Standard: `ISO 1328-2:2020 / ANSI/AGMA ISO 1328-2-A21`
- Status: `Disabled in shipped app pending approved extract`

## Variables Used In The Current Solver

- `referenceDiameter (d)`: reference diameter in mm
- `normalModule (mn)`: normal module in mm
- `flankToleranceClass (A)`: ISO flank tolerance class
- `toothCount (z)`: tooth count
- `faceWidth (b)`: face width in mm
- `helixAngle (beta)`: helix angle in degrees

## Current Formula Path Carried In The Repo

`FrT = 0.9 * (0.002 d + 0.55 sqrt(d) + 0.7 mn + 12) * (sqrt(2))^(A - 5)`

- The repository carries this relationship as a controlled internal extract.
- This relationship remains `Provisional` until it is matched against the purchased or formally approved internal extract and signed off.

## Rounding Rule Carried In The Repo

- `> 10 um`: nearest `1 um`
- `5 um` to `10 um`: nearest `0.5 um`
- `< 5 um`: nearest `0.1 um`

## Applied Center-Tolerance Method

The shipped app uses the following internal worksheet rule after `FrT` is solved:

`Allowable center tolerance (TIR) = max(0, FrT - fitLocationTirReserve - workholdingTirReserve - measurementTirReserve - processTirReserve - additionalTirReserve)`

`Equivalent radial center offset = Allowable center tolerance (TIR) / 2`

Required reserve lines:

- `fitLocationTirReserve`
- `workholdingTirReserve`
- `measurementTirReserve`
- `processTirReserve`
- `additionalTirReserve`

Rules locked into the app:

- Use worst-case arithmetic subtraction, not RSS or any statistical combination.
- Each reserve must be entered as a non-negative TIR-equivalent value at the same centering datum as recorded `Fr`.
- Each reserve must include a recorded method and notes describing its source and conversion.
- The app does not auto-deduct mounting-face runout.
- The app does not auto-deduct fit recommendation outputs.
- If the reserve worksheet is incomplete or the residual is zero or negative, release remains blocked.

## Operator Worksheet Instructions

1. Confirm the ISO 1328-1 basis and the ISO/TR 10064-1 inspection method used for the recorded `Fr` reading.
2. Solve and display the rounded allowable ISO runout `FrT`.
3. Convert every non-centering contributor into a TIR-equivalent reserve at the same datum as `Fr`.
4. Record the reserve value together with the method and notes showing the source and conversion.
5. Sum the reserve lines and subtract the total from `FrT`.
6. If the remainder is `<= 0`, block release and report that no center-tolerance budget remains.
7. If the remainder is `> 0`, publish the allowable center tolerance `(TIR)` and the equivalent radial center offset.

## Applicability Limits Used In The Solver

- tooth count: `5` to `1000`
- reference diameter: `5 mm` to `15000 mm`
- normal module: `0.5 mm` to `70 mm`
- face width: `4 mm` to `1200 mm`
- absolute helix angle: `<= 45 deg`

## Worked Benchmarks In The Repo

### Spur

- family: `spur`
- tooth count: `32`
- reference diameter: `81.28 mm`
- normal module: `2.54 mm`
- ISO flank tolerance class: `8`
- current rounded `FrT`: `48 um`
- reserve-budget total: `0.018 mm TIR`
- current allowable center tolerance: `0.030 mm TIR`

### Helical

- family: `helical`
- tooth count: `24`
- reference diameter: `60.96 mm`
- normal module: `2.4534516 mm`
- ISO flank tolerance class: `8`
- current rounded `FrT`: `46 um`
- reserve-budget total: `0.018 mm TIR`
- current allowable center tolerance: `0.028 mm TIR`

### Rack And Pinion

- family: `rackPinion`
- tooth count: `20`
- reference diameter: `63.5 mm`
- normal module: `3.175 mm`
- ISO flank tolerance class: `8`
- current rounded `FrT`: `48 um`
- reserve-budget total: `0.018 mm TIR`
- current allowable center tolerance: `0.030 mm TIR`

## Release Policy

- The app may report the normative standards quantity `FrT`.
- The app may report an internal allowable center tolerance when the reserve worksheet is complete.
- Machining release remains blocked while any of these are true:
  - the standards basis is not approved
  - the runout measurement method is not confirmed
  - the reserve worksheet is incomplete or unresolved
  - the reserve worksheet has not been manually confirmed
  - the independent hand check is not complete

## Required Approval Fields Before Plant Release

- Approved internal extract identifier: `TODO`
- Reviewer name: `TODO`
- Review date: `TODO`
- Verified standard/edition: `TODO`
- Verified clause/equation reference: `TODO`
- Verified rounding rule: `TODO`
- Reserve-budget method reviewer: `Recorded in repo logic`
- Reserve-budget method reference: `CENTER-TOLERANCE-BUDGET-01`
