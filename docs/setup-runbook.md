# Setup Runbook

## Purpose

This runbook lets a devops admin set up Document System for a new consultancy install in less than one hour of hands-on time, excluding LLM-call latency and human review time for generated blocks.

The setup flow turns curated demo files into:

- A reviewed shared `brand.yaml`.
- Optional reviewed generated blocks in `generated-blocks/active/`.
- A per-consultant local config and OS-keychain LLM credentials.

## Prerequisites

- Node 20+ and npm 10+ installed.
- Rust toolchain installed for Tauri validation.
- Repository checked out at the release commit to install.
- LLM API credentials available to devops.
- A cloud-synced shared folder chosen for the consultancy, for example `~/Consultancy-Shared/`.
- A cloud-synced client-documents folder chosen for each consultant.
- 3-10 curated demo files from the consultancy in DOCX, PPTX, or PDF format.

Before using demo files, remove client-confidential names and content that are not needed to infer brand identity or reusable layout patterns. The setup pipeline sends extracted demo analysis to the LLM for brand extraction and catalogue comparison.

## One-Time Consultancy Setup

### 1. Prepare Inputs

Create an input folder:

```bash
mkdir -p /tmp/docsystem-demos
```

Copy the curated demo files into that folder. Keep filenames descriptive enough for review, for example:

```text
/tmp/docsystem-demos/
  board-readout.pptx
  proposal-template.docx
  audit-report.pdf
```

### 2. Run Demo Scan

Run the setup scan:

```bash
npm run setup:scan-demos -- --input /tmp/docsystem-demos --output /tmp/docsystem-setup-output
```

Expected outputs:

- `/tmp/docsystem-setup-output/demo-analysis.json`
- `/tmp/docsystem-setup-output/brand.draft.yaml`
- `/tmp/docsystem-setup-output/catalogue-diff.json`
- `/tmp/docsystem-setup-output/setup-report.md`
- `/tmp/docsystem-setup-output/generated-blocks/pending/` when new blocks are proposed

If the command fails, stop and fix the reported parse, schema, or lint error before continuing.

### 3. Review Brand Draft

Open `/tmp/docsystem-setup-output/setup-report.md` and `/tmp/docsystem-setup-output/brand.draft.yaml`.

Confirm with the consultancy:

- Consultancy name, short name, and confidentiality notice.
- Logo paths and shared asset locations.
- Brand colors and semantic color references.
- Fonts, typography scale, spacing, page, and deck settings.
- Chart defaults.

Edit `brand.draft.yaml` directly if the LLM inferred an incorrect value. Do not invent missing brand values. Use `TBD` and flag the item for consultancy review.

When approved:

```bash
mkdir -p ~/Consultancy-Shared
cp /tmp/docsystem-setup-output/brand.draft.yaml ~/Consultancy-Shared/brand.yaml
```

### 4. Review Generated Blocks

If `/tmp/docsystem-setup-output/generated-blocks/pending/` is empty, skip this step.

For each proposed generated block:

- Confirm no Tier 1 block can express the observed pattern.
- Review schema, renderer, TipTap node, and test files.
- Confirm generated code uses only the scaffolded surface and approved imports.
- Confirm there is no `dangerouslySetInnerHTML`, `eval`, `Function`, `fetch`, `XMLHttpRequest`, direct CSS injection, browser-global access, or hard-coded brand values.
- Confirm generated tests describe a valid and invalid fixture for the block.

Run validation:

```bash
npm run setup:validate -- \
  --shared ~/Consultancy-Shared \
  --generated-blocks /tmp/docsystem-setup-output/generated-blocks/pending
```

For each approved block, update the metadata header with reviewer name and date, then move the whole block folder into the app's active generated-block folder:

```bash
mkdir -p generated-blocks/active
mv /tmp/docsystem-setup-output/generated-blocks/pending/<block-folder> generated-blocks/active/
```

Leave rejected blocks in `pending/` or delete them from the setup-output folder. Never move an unreviewed generated block into `active/`.

### 5. Validate Shared Install State

Run:

```bash
npm run setup:validate -- \
  --shared ~/Consultancy-Shared \
  --generated-blocks generated-blocks/active
```

Then run:

```bash
bash scripts/verify-gates.sh
```

Both commands must pass before configuring consultant machines.

## Per-Consultant Machine Setup

Run on each consultant's machine:

```bash
npm run setup:install
```

The wizard asks for:

- Name, email, and role.
- Client document cloud-sync folder.
- Shared brand folder.
- Fast and thinking LLM provider/model choices.
- API keys, stored in the OS keychain.
- Monthly LLM cap and whether local cost tracking is enabled.

The consultant must accept the privacy notice before setup writes config. The notice explains that no telemetry is collected and that the local cost ledger stores only operational spend fields.

For scripted rollout, use:

```bash
FAST_API_KEY="..." THINKING_API_KEY="..." npm run setup:install -- \
  --name "Jane Smith" \
  --email j.smith@boutique.example \
  --role consultant \
  --cloud-sync-root "$HOME/Dropbox/Consultancy" \
  --shared-folder "$HOME/Consultancy-Shared" \
  --fast-provider anthropic \
  --fast-model claude-haiku-4 \
  --thinking-provider anthropic \
  --thinking-model claude-opus-4-7 \
  --monthly-cap-usd 50 \
  --accept-privacy-notice
```

Do not place API keys in shell history on shared machines. Prefer a secured devops shell, temporary environment injection, or manual interactive entry.

## Verification Checklist

On each consultant machine:

- `config.yaml` exists in the app config directory.
- LLM API keys are present in the OS keychain and absent from `config.yaml`.
- `~/Consultancy-Shared/brand.yaml` validates.
- The app opens and shows the library.
- A sample proposal and sample deck validate and render.
- `Settings -> My LLM Spend` opens.
- "Clear all cost history" is visible.
- Cost tracking can be disabled if required by the consultant.

## Troubleshooting

- **Demo scan fails:** inspect the named input file and rerun with a smaller set of demos.
- **Brand schema fails:** edit `brand.draft.yaml` to match `brand.example.yaml`, then rerun validation.
- **More than 10 new blocks proposed:** stop and escalate to developer review. Do not bypass the cap.
- **Generated block lint fails:** reject the block or regenerate after fixing the scaffold. Do not hand-edit unsafe generated code into `active/`.
- **Path validation fails during install:** create the selected folder or choose a writable cloud-sync folder outside the app config directory.
- **LLM endpoint check fails:** verify provider, base URL, model name, and API key.
- **Cost ledger cannot initialize:** check app config directory permissions.

## Handoff

Record for the consultancy:

- Shared folder path.
- Approved brand file location.
- Generated blocks approved and reviewer/date.
- LLM providers and model names, not API keys.
- Monthly cap policy.
- Any `TBD` brand values or rejected generated block proposals.

Do not record API keys, prompt contents, response contents, or cost-ledger rows in the handoff notes.
