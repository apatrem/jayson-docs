#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { fillPlanSchema } from '@schema/index.js';

const program = new Command();

program
  .name('jayson-docs')
  .description('Template-fill CLI for Acme consulting deliverables. Pure mechanical fill — no LLM call.')
  .version('0.1.0');

program
  .command('fill')
  .description('Fill a master template (.pptx or .docx) with a schema-valid fill-plan')
  .requiredOption('--template <path>', 'path to the master .pptx or .docx (in templates/)')
  .requiredOption('--plan <path>', 'path to a schema-valid fill-plan JSON file, or "-" to read it from stdin')
  .requiredOption('--out <path>', 'output file path; extension determines format and must match --template')
  // eslint-disable-next-line @typescript-eslint/require-await -- async action; awaits the pipeline once M2/M3/M4 wire it
  .action(async (opts: { template: string; plan: string; out: string }) => {
    const templateExt = extname(opts.template).toLowerCase();
    const outExt = extname(opts.out).toLowerCase();

    if (templateExt !== outExt) {
      process.stderr.write(
        `--template (${templateExt}) and --out (${outExt}) must have the same extension.\n`,
      );
      process.exit(2);
    }
    if (templateExt !== '.pptx' && templateExt !== '.docx') {
      process.stderr.write(`unsupported template extension: ${templateExt}\n`);
      process.exit(2);
    }

    let fillPlan: unknown;
    try {
      // `--plan -` reads from stdin (fd 0); otherwise read the file. Both are
      // cross-platform — no OS-specific temp path needed.
      const raw = opts.plan === '-' ? readFileSync(0, 'utf-8') : readFileSync(opts.plan, 'utf-8');
      fillPlan = JSON.parse(raw);
    } catch (e) {
      process.stderr.write(`failed to read fill-plan: ${String(e)}\n`);
      process.exit(2);
    }

    // Validate the fill-plan against the schema. Reject fast.
    const parsed = fillPlanSchema.safeParse(fillPlan);
    if (!parsed.success) {
      process.stderr.write(`fill-plan validation failed:\n${parsed.error.toString()}\n`);
      process.exit(2);
    }

    // Dispatch on extension.
    if (templateExt === '.pptx') {
      // TODO M2/M3: wire load-master, fill-slide × N, save-output.
      process.stderr.write('PPTX fill — implementation pending M2/M3.\n');
      process.exit(2);
    } else {
      // TODO M4: wire docx pipeline (dolanmiu/docx).
      process.stderr.write('DOCX fill — implementation pending M4 (docx pipeline).\n');
      process.exit(2);
    }
  });

await program.parseAsync(process.argv);
