import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const setupScript = join(root, '.superset/setup.sh');

describe('Superset setup script', () => {
  it('uses Corepack with the pinned pnpm command when no global pnpm exists', () => {
    const temp = mkdtempSync(join(tmpdir(), 'jayson-docs-superset-'));
    const fakeBin = join(temp, 'bin');
    const capture = join(temp, 'corepack-args.txt');

    mkdirSync(fakeBin);
    const fakeCorepack = join(fakeBin, 'corepack');
    writeFileSync(fakeCorepack, `#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$COREPACK_ARGS_FILE\"\n`);
    chmodSync(fakeCorepack, 0o755);

    const stdout = execFileSync('/bin/bash', [setupScript], {
      cwd: root,
      encoding: 'utf-8',
      env: {
        ...process.env,
        COREPACK_ARGS_FILE: capture,
        PATH: fakeBin,
      },
    });

    expect(readFileSync(capture, 'utf-8').trim().split('\n')).toEqual([
      'pnpm',
      'install',
      '--frozen-lockfile',
    ]);
    expect(stdout).toContain('Workspace ready');
  });

  it('fails with a clear message when Corepack is unavailable', () => {
    let stderr = '';
    try {
      execFileSync('/bin/bash', [setupScript], {
        cwd: root,
        encoding: 'utf-8',
        env: { ...process.env, PATH: '' },
        stdio: 'pipe',
      });
    } catch (error) {
      stderr = (error as { stderr?: string }).stderr ?? '';
    }

    expect(stderr).toContain('Corepack is required');
  });
});
