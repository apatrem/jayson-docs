# M4 Perf Benchmark Harness

This directory contains the durable D-39 perf spike harness.

Run the benchmark:

```bash
npm run test:perf
```

The benchmark loads `tests/perf/fixtures/anchor-doc.yaml` in a real headless Chromium browser through Playwright and asserts the six D-39 targets:

- Cold doc open: `< 1s`
- First chart paint on scroll into view: `< 200ms`
- Table mount: `< 150ms`
- Table cell typing latency: `< 16ms`
- Table cell navigation latency: `< 16ms`
- Memory growth sample: `< 100MB`

To emit a Markdown report:

```bash
PERF_WRITE_REPORT=1 npm run test:perf
```

That writes `docs/perf-spike-results.md`. The default test run does not write the report, so normal gates leave the working tree clean.
