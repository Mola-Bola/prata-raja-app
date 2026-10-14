# Codex capacity retry

Ledger 20; branch `sol/fleet-retry`; base `cfcc997`.

The Codex runner scanned logs and final output for `model is at capacity` before accepting success. A completed review quoting that source text therefore triggered four unnecessary retries and eventually failed, despite exit code zero and nonempty valid review JSON. The runner now accepts error-free exit-zero output first. Failed or empty-output calls retain the existing capacity detection, five-minute delay and four-retry limit. Review JSON validation still happens in the existing review caller.

The mocked-CLI integration regression writes valid findings and logs containing the quoted phrase. Before the fix it reproduced all five false attempts and failure. After the fix it verifies preserved findings, exactly one invocation and no second attempt log. The existing genuine failed-capacity regression was left unchanged and also passes.

Validation: both focused capacity tests passed; Node syntax, TypeScript and diff whitespace checks passed. No real Codex/API review was called in testing. Parent owns the full real slice gate and recovery of the earlier verifier evidence; no duplicate full check ran locally.
