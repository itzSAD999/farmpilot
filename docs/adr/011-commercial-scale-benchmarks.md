# ADR 011: Commercial Scale Caveat for Benchmarks

## Context
FarmPilot aims to flag inefficient spending for smallholder farmers. However, our benchmark data is sourced from commercial-scale farm records and CSIR-CRI extension recommendations. 
A 100-acre commercial farm purchases inputs in bulk, utilizes mechanized equipment across large areas, and distributes fixed costs efficiently. Consequently, their per-acre cost is significantly lower than that of a 2-acre smallholder farmer.

If we benchmark a smallholder against these commercial figures without adjustment, the system will flag them as overspending on nearly every category.

## Options Considered
1. **Adjust upward for scale**: Apply a statistical factor to commercial costs to estimate smallholder costs. This risks obfuscating the data and providing "made up" numbers that lack empirical backing.
2. **State plainly that benchmarks represent commercial-scale efficiency**: Present the unadjusted commercial figures, but clearly state in the report's limitations that the gap represents an *improvement ceiling* and long-term goal, rather than an immediate, realistic target for a smallholder.

## Decision
We chose **Option 2**. We will use unadjusted commercial-scale figures and state this plainly as a caveat.

## Consequences
- **More defensible data**: We are not fabricating statistical adjustments. The numbers are grounded in real commercial records.
- **Aspirational framing**: The gap between the farmer's cost and the benchmark represents the ultimate ceiling of efficiency they can strive for as their operation grows and modernizes, rather than just a baseline pass/fail metric.
- **Reporting requirements**: The UI and physical reports must clearly communicate this caveat so smallholders do not feel demoralized by the large variance.
