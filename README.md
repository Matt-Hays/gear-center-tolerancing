# Gear Bore Tolerancing

`gear-bore-tolerancing` is a local-first Vue 3 application for reverse-engineering gears, recommending bore and fit dimensions, and validating center tolerancing before broaching or machining review. The current release is optimized around a rack-and-pinion "Center before broach" workflow, while still supporting spur and helical jobs as secondary workflows.

This README is written as an audit-grade guide to the application as it exists in this repository on April 6, 2026. It documents verified behavior, current release posture, step-by-step operator workflow, and the exact validation path an engineer can follow to confirm the center-tolerancing result.

## Audit Snapshot

Verified in this repo on April 6, 2026:

- `npm run test:unit -- --run` passes.
- `npm run build` passes.
- The primary user workflow is rack-and-pinion centering through the `rack-centering` pathway.
- The app separates the normative standards quantity from the internal center-tolerance residual.
- A mathematically valid result can still remain release-blocked because the active ISO basis is still marked `provisional`.

## What The Application Does

The app combines five jobs into one engineering workflow:

1. Capture a reverse-engineering job and its evidence.
2. Reconstruct governing gear geometry from measured or known pitch data.
3. Recommend bore fit and keyed or interference interface dimensions.
4. Solve a standards-based allowable runout quantity (`FrT`) and then resolve an internal allowable center tolerance from an explicit reserve-budget worksheet.
5. Build a review/export packet that includes checklist status, traceability, standards references, and machinist-facing outputs.

The intended audience is an engineer, analyst, quality reviewer, or manufacturing reviewer working on replacement gears, bore location, and pre-broach centering decisions.

## Supported Scope

Supported gear families:

- `spur`
- `helical`
- `rackPinion`

Unsupported gear families:

- `bevel`
- `worm`
- `hypoid`

Available pathways:

- `rack-centering`: rack-and-pinion field workflow for "Center before broach"
- `replicate-from-od`: derive pitch geometry from tooth count and outside diameter
- `direct-pitch`: use known module or diametral pitch as the governing input

Primary route flow:

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | Home | start a job, load the sample, or import a project |
| `/analysis/new` | Inputs | capture job metadata, workflow choices, and measurements |
| `/analysis/review` | Check | review missing inputs, issues, and release checklist items |
| `/analysis/recommendation` | Result | inspect fit recommendation, centering result, blockers, and trace |
| `/analysis/export` | Export | download workbook, PDF, or project JSON |

## Audit Notes And Release Posture

The current centering implementation is intentionally conservative and explicitly split into two different quantities:

- `Allowable ISO runout FrT` is the normative standards quantity carried by the app.
- `Allowable center tolerance (TIR)` is an internal engineering residual obtained by subtracting an explicit reserve budget from `FrT`.

Current standards posture:

- Active basis: `iso1328Part1Runout`
- Active standard label: `ISO 1328-1:2013 / ANSI/AGMA ISO 1328-1-B14`
- Current basis status: `provisional`
- Disabled basis present in code: `iso1328Part2RadialRunout`

What that means in practice:

- The app can calculate and display `FrT`.
- The app can calculate and display the final allowable center tolerance when the reserve worksheet is complete.
- The app will still keep the release gate blocked while the standards basis remains provisional.

Important current rules built into the shipped logic:

- The center-tolerance result is not treated as a direct ISO output.
- The reserve worksheet uses worst-case arithmetic subtraction, not RSS or any statistical combination.
- `mountingFaceRunout` is setup evidence only and is not used as the normative ISO acceptance quantity.
- `mountingFaceRunout` is not auto-deducted from the center-tolerance budget.
- Fit recommendation outputs are not auto-deducted from the center-tolerance budget.
- Every reserve line must have a non-negative value plus recorded method and notes before the final center tolerance is issued.

## How The App Works

The actual computation pipeline in the app is:

1. Normalize all user-entered measurements into canonical solver units.
2. Resolve pathway requirements, required fields, and cross-check issues.
3. Solve geometry for the selected family and pathway.
4. Solve the fit recommendation from the reconstructed geometry and interface inputs.
5. Solve centering from the active standards basis and the measured `Fr` input.
6. Build the reserve-budget residual and equivalent radial offset.
7. Build the release checklist and release-gate state.
8. Generate trace metadata and exportable workbook/PDF content.

The current centering equations carried in the repo are:

```text
FrT = 0.9 * (0.002 d + 0.55 sqrt(d) + 0.7 mn + 12) * (sqrt(2))^(A - 5)
```

Rounded per the repo's ISO micrometre rule:

- above `10 um`: nearest `1 um`
- `5 um` to `10 um`: nearest `0.5 um`
- below `5 um`: nearest `0.1 um`

After `FrT` is solved, the app applies the internal reserve-budget rule:

```text
Allowable center tolerance (TIR) =
max(0, FrT - fitLocationTirReserve - workholdingTirReserve
       - measurementTirReserve - processTirReserve - additionalTirReserve)

Equivalent radial center offset = Allowable center tolerance (TIR) / 2
```

## Public Interfaces And Stored Statuses

User-facing workflow screens:

- Home
- Inputs
- Check
- Result
- Export

Release-gate status values used by the app:

| Status | Meaning |
| --- | --- |
| `blocked` | open issues, missing evidence, incomplete checklist, or provisional basis is preventing machining review |
| `pendingIndependentCheck` | all required items except the independent hand-check are complete |
| `readyForMachiningReview` | required checks are complete and the result is ready for machining review |

Result status values used by the app:

- `blocked`
- `draft`
- `reviewReady`

Project-file schema:

- `ProjectFileV1`

The app also auto-saves a local draft in browser storage and can reopen a saved project JSON export later.

## Critical Usage Rules For Center-Tolerance Validation

If the goal is to validate center tolerancing correctly, use the app this way:

1. Use the rack-and-pinion `rack-centering` pathway for field centering validation.
2. Select an ISO flank tolerance class intentionally. The standards quantity is blocked until you do.
3. Enter the measured standards runout as `Measured runout Fr`. Do not substitute `Mounting face runout` for it.
4. Treat all reserve lines as TIR-equivalent values at the same centering datum as `Fr`.
5. Record a method and notes on every reserve line before expecting the final allowable center tolerance to appear.
6. Complete the Check page checklist to separate a genuine math problem from a manual review blocker.
7. Read the Result page in two layers:
   first confirm the centering math;
   then confirm whether the release gate is still blocked for administrative or standards reasons.

## Install And Run

Prerequisites:

- Node.js 22.x or newer is the safest match for the current toolchain.
- npm is used in this repo.

Install and run locally:

```bash
npm install
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Step-By-Step Engineer Usage Guide

This is the recommended normal-use workflow for an engineer validating center tolerancing.

### 1. Start The App

1. Run `npm install` if dependencies are not already installed.
2. Run `npm run dev`.
3. Open the Vite local URL shown in the terminal.
4. From Home, choose one of:
   `Start rack job` for a new field-validation job,
   `Load sample` for the shipped validation case,
   `Open file` to reopen a saved `ProjectFileV1` export.

### 2. Set Up The Job On Inputs

1. Fill in project metadata such as project name, analyst, customer, part number, and notes.
2. Keep `Gear family` set to `Rack and pinion` when validating a field centering case.
3. Keep the primary pathway set to `Center before broach`.
4. Select the correct `Shaft interface`.
5. Select the correct `Unit system`.
6. Select the correct `Duty class`.
7. Choose the `ISO flank tolerance class`.

Important:

- The app will not issue the standards quantity until the ISO class is selected.
- Rack and pinion is the primary workflow in this release.

### 3. Enter Geometry Inputs

For the rack-centering field workflow, enter at minimum:

- `Tooth count`
- `Outside diameter`
- `Face width`
- `Rack linear pitch`

Recommended supporting cross-checks when you have them:

- `Pressure angle`
- `Known transverse module`
- `Known transverse diametral pitch`
- `Known pitch diameter`

### 4. Enter Centering Evidence

Enter:

- `Measured runout Fr`
- `Mounting face runout`

Then enter every reserve line:

- `Fit and location reserve (TIR)`
- `Workholding reserve (TIR)`
- `Measurement reserve (TIR)`
- `Process reserve (TIR)`
- `Additional reserve (TIR)`

For each reserve line:

1. Enter the numeric value.
2. Open `Evidence`.
3. Record a non-empty `Method`.
4. Record a non-empty `Notes`.

The solver will block the final allowable center tolerance if a reserve line is missing, negative, or missing method/notes.

### 5. Enter Fit Inputs

Enter:

- `Measured bore diameter`
- `Measured shaft diameter`
- `Confirmed nominal shaft size`

If the interface is keyed, also enter cross-check dimensions when available:

- `Measured key width`
- `Measured hub keyway depth`

Use `Use suggested nominal` only as a convenience helper. A suggested nominal is exploratory and does not clear the release gate until it is explicitly confirmed.

### 6. Review The Check Page

Open `Check` and use it to separate missing data from review-state blockers.

Confirm:

- missing fields are closed
- geometry snapshot looks reasonable
- issue cards match your expectations
- release checklist items are completed where appropriate

Manual checklist items that may need to be checked by the engineer:

- `Published reference pack confirmed for release`
- `Standards runout method confirmed`
- `Damaged-tooth review completed`
- `Reserve budget confirmed for release`
- `Independent hand-check completed`

### 7. Review The Result Page

Use `Result` to validate both the numbers and the release posture.

Confirm the centering section in this order:

1. `Allowable ISO runout FrT`
2. `Allowable center tolerance (TIR)`
3. `Reserve budget total`
4. `Equivalent radial center offset`
5. `Standards acceptance`
6. `Basis status`
7. `Release blockers`

Also review:

- `Bore center basis`
- `Checks`
- `Reserve-budget worksheet`
- `Center-tolerance method`
- `Open items`
- `Trace`

### 8. Export The Job Package

Open `Export` and download what you need:

- `Download XLSX`
- `Download PDF`
- `Save project file`

The JSON project file is the easiest way to reopen the exact same job state later.

## Center-Tolerance Validation Walkthrough: Shipped Sample

Use this walkthrough when you want the fastest end-to-end confirmation that the shipped app is solving the rack-centering case correctly.

### Steps

1. Start the app with `npm run dev`.
2. From Home, click `Load sample`.
3. The sample opens as a complete rack-and-pinion job.
4. To compare directly against the repo's canonical metric benchmark values, open `Inputs` and change `Unit system` to `Metric`.
5. Open `Check` and mark the manual checklist items complete if they are not already:
   `Published reference pack confirmed for release`,
   `Standards runout method confirmed`,
   `Damaged-tooth review completed`,
   `Reserve budget confirmed for release`,
   `Independent hand-check completed`.
6. Open `Result`.

### What To Confirm On Result

You should confirm all of the following:

- `Allowable ISO runout FrT` is `48 um`.
- `Reserve budget total` is `0.018 mm`.
- `Allowable center tolerance (TIR)` resolves to `0.03 mm`.
- The canonical benchmark value for that result is `0.030 mm TIR`.
- `Equivalent radial center offset` is `0.015 mm`.
- `Standards acceptance` is `Pass`.
- `Basis status` is `provisional`.
- `Release gate` remains `blocked`.
- The release blockers include the fact that the selected standards basis remains provisional and is not approved for release use.

Additional rack-specific values you should also see:

- pitch diameter: `63.5 mm`
- rack linear pitch: about `9.9746 mm`
- center height from rack pitch line: `31.75 mm`

Interpretation:

- The center-tolerance math is valid.
- The result is still not release-cleared because the standards basis is intentionally shipped as provisional.

## Center-Tolerance Validation Walkthrough: Manual Benchmark Entry

Use this walkthrough when you want to validate the center-tolerancing logic without relying on the sample loader.

### Workflow Settings

Create a new job and set:

| Field | Value |
| --- | --- |
| Gear family | `Rack and pinion` |
| Pathway | `Center before broach` |
| Shaft interface | `Keyed` |
| Unit system | `Metric` |
| Duty class | `Normal` |
| ISO flank tolerance class | `Class 8` |

### Required Measurement Entry

Enter these values:

| Measurement | Value |
| --- | --- |
| Tooth count | `20` |
| Outside diameter | `69.85 mm` |
| Face width | `31.75 mm` |
| Rack linear pitch | `9.974556675 mm` |
| Measured runout Fr | `0.0254 mm` |
| Mounting face runout | `0.0127 mm` |
| Fit and location reserve (TIR) | `0.004 mm` |
| Workholding reserve (TIR) | `0.003 mm` |
| Measurement reserve (TIR) | `0.002 mm` |
| Process reserve (TIR) | `0.006 mm` |
| Additional reserve (TIR) | `0.003 mm` |
| Measured bore diameter | `38.1127 mm` |
| Measured shaft diameter | `38.1 mm` |
| Confirmed nominal shaft size | `38.1 mm` |

Recommended cross-check values to match the repo benchmark more closely:

| Measurement | Value |
| --- | --- |
| Pressure angle | `20 deg` |
| Known transverse module | `3.175 mm` |
| Known transverse diametral pitch | `8` |
| Known pitch diameter | `63.5 mm` |
| Measured key width | `9.525 mm` |
| Measured hub keyway depth | `4.7752 mm` |

### Reserve Evidence Entry

For all five reserve lines, open `Evidence` and enter:

- Method: `Hand-reviewed reserve conversion worksheet`
- Instrument: `Reviewed engineering worksheet`

Use notes that clearly describe the TIR conversion. To mirror the benchmark dataset, you can use:

| Reserve Line | Notes |
| --- | --- |
| Fit and location reserve (TIR) | `Converted fit and location contributors to TIR at the centering datum.` |
| Workholding reserve (TIR) | `Converted workholding repeatability to TIR at the centering datum.` |
| Measurement reserve (TIR) | `Converted measurement transfer effects to a TIR-equivalent reserve.` |
| Process reserve (TIR) | `Converted machining process variation to a TIR-equivalent reserve.` |
| Additional reserve (TIR) | `Reserved explicit additional legacy-part recreation allowance in TIR.` |

### Checklist Completion

On `Check`, complete these manual checklist items:

- `Published reference pack confirmed for release`
- `Standards runout method confirmed`
- `Damaged-tooth review completed`
- `Reserve budget confirmed for release`
- `Independent hand-check completed`

### Expected Result

On `Result`, you should see:

- `Allowable ISO runout FrT`: `48 um`
- `Reserve budget total`: `0.018 mm`
- `Allowable center tolerance (TIR)`: `0.03 mm`
- `Equivalent radial center offset`: `0.015 mm`
- `Standards acceptance`: `Pass`
- `Basis status`: `provisional`
- `Release gate`: `blocked`

The key point is that the math should solve cleanly, while the release gate remains blocked for standards-governance reasons rather than missing engineering data.

## Exports

### Project JSON

- Saved from `Save project file`
- Schema version: `ProjectFileV1`
- Best choice for reopening the exact job state later

### XLSX Workbook

The workbook currently contains these sheets:

- `Project`
- `Measurements`
- `Derived Geometry`
- `Machinist Worksheet`
- `Engineering Appendix`
- `Standards Snapshot`
- `Trace`
- `Recommendation`

The workbook includes:

- machinist-facing centering and fit dimensions
- reserve-budget lines
- checklist status
- issues
- standards snapshot
- full trace metadata

### PDF Report

The PDF is a multi-page review packet that includes:

- release gate summary
- centering outputs
- fit outputs
- machinist checklist
- reserve-budget notes
- engineering appendix
- release checklist
- issues
- geometry snapshot
- trace

### What To Use For Which Audience

- Use the XLSX workbook when you need structured handoff data and tabular review detail.
- Use the PDF when you need a portable review packet.
- Use the project JSON when you need to reopen or archive the exact app state.

## Developer Validation

Run these commands when validating the repo itself:

```bash
npm run dev
npm run test:unit -- --run
npm run build
npm run audit:screenshots
```

What each command covers:

- `npm run dev`: local interactive workflow testing
- `npm run test:unit -- --run`: calculation, view, export, contrast, and store/theme tests
- `npm run build`: production build plus type-check gate
- `npm run audit:screenshots`: captures the five routes in light and dark themes at desktop and mobile widths

The screenshot audit writes into `tmp-ui-audit-shots` and is meant to be paired with the automated unit suite before release review.

## Current Constraints And Known Gaps

- The active ISO centering basis is still `provisional`, so release stays blocked even when the math is correct.
- `iso1328Part2RadialRunout` exists in the repo but is intentionally disabled in the shipped app.
- Unsupported families such as `bevel`, `worm`, and `hypoid` are blocked.
- The final center tolerance is blocked if any reserve value is missing, invalid, or missing method/notes.
- The app does not infer reserves automatically from setup evidence or fit outputs.
- The app relies on manual checklist completion for standards confirmation, damaged-tooth review, reserve-budget confirmation, and independent hand-check.

## Repo Evidence Behind This README

The behavior described above is grounded in the current repository implementation, especially:

- `src/lib/calculations/engine.ts`
- `src/lib/calculations/centeringRecommendation.ts`
- `src/data/measurementCatalog.ts`
- `src/data/standardsProfiles.ts`
- `src/data/sampleProjects.ts`
- `src/lib/exports/xlsx.ts`
- `src/lib/exports/pdf.ts`
- `docs/validation/iso1328-runout-validation.md`
- `docs/validation/ui-audit-workflow.md`
- `tests/engine.test.ts`
- `tests/exports.test.ts`
- `tests/views.test.ts`
- `tests/benchmarks/derivations/rack-pinion-rack-centering.md`

If the code changes, re-run the validation commands above and update this README so it stays aligned with shipped behavior.
