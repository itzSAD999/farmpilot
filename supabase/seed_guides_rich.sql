-- Rich Markdown Body for Guide 1 (Fertiliser)
UPDATE guides SET body_markdown = 
'# Understanding the Government Fertilizer Subsidy Program

Missing the subsidy window is the most common avoidable overspend for farmers. Subsidies are typically allocated before the major season begins, so early registration is critical. Contact your local District Agricultural Department early in the year.

## Why it matters
Fertilizer represents up to 40% of the total production cost for crops like maize and rice. The Planting for Food and Jobs (PFJ) subsidy can reduce this cost by up to 50%. 

## Common Pitfalls
- **Waiting too late:** Subsidy quotas run out quickly in high-demand regions.
- **Buying from unauthorized dealers:** You risk buying fake or unsubsidized fertilizer.
- **Not having a Ghana Card:** Registration requires valid identification.

### Expert Tip
Form a cooperative with your neighbors. MoFA officers are more likely to prioritize groups that can purchase in bulk and demonstrate serious commitment.'
WHERE id = 1;

-- Rich Markdown Body for Guide 2 (Seeds)
UPDATE guides SET body_markdown = 
'# Sourcing Certified High-Yield Seeds

Farmers often save seeds from previous harvests to cut costs, but this leads to diminishing yields over time. Certified seeds are bred for disease resistance and climate resilience.

## The True Cost of Saved Seed
While saved seed is "free", it can cost you up to 30% of your potential yield. For a 5-acre farm, that lost yield could be worth 10x the cost of buying certified seed.

## What makes seed "Certified"?
- Tested for minimum 85% germination rate
- Treated with fungicides to protect against early soil diseases
- Guaranteed genetic purity (no mixed varieties)

### Pro-Tip
Always keep the certification tag from your seed bag. If the germination fails, you can use the tag to get a replacement from the supplier or report them to the regulatory body.'
WHERE id = 2;

-- Rich Markdown Body for Guide 3 (Agrochem)
UPDATE guides SET body_markdown = 
'# Effective Pesticide and Herbicide Application

Over-applying agrochemicals is a common waste of money and harms the soil. Always follow the manufacturer''s dosage instructions exactly.

## The "More is Better" Myth
Many farmers double the recommended dose thinking it will kill pests faster. In reality, this:
- Burns the crop leaves (phytotoxicity)
- Wastes money
- Builds pest resistance faster

## Proper Application Techniques
- **Calibration:** Test your sprayer with plain water first to ensure the nozzle is spraying a fine mist, not heavy drops.
- **Timing:** Spray between 6am and 9am, or after 4pm. Midday heat causes the chemical to evaporate before the plant absorbs it.
- **Water Quality:** Use clean water. Muddy water can neutralize the active ingredients in many herbicides (like Glyphosate).

### Remember
Always wear protective clothing. Health costs from chemical exposure will far exceed any money saved on the farm.'
WHERE id = 3;

-- Rich Markdown Body for Guide 4 (Land Prep)
UPDATE guides SET body_markdown = 
'# Cost-Effective Land Preparation

Plowing bone-dry soil takes more time, fuel, and tractor hours. Waiting for the first rains softens the soil and significantly reduces land preparation costs.

## Why timing matters
Tractor operators charge by the acre, but if the soil is too hard, they will use more fuel and charge higher rates (or refuse the job entirely). 

## Pre-plowing Checklist
- **Clear stumps:** Remove all hidden stumps. If a tractor hits a stump and breaks a plow, they will abandon your farm.
- **Mark boundaries:** Clearly mark your farm boundaries with pegs so the operator doesn''t waste time plowing outside your land.
- **Coordinate:** If you and 3 neighbors need plowing, negotiate a group rate. The operator saves fuel driving between farms and can pass the savings to you.

### Minimum Tillage Option
Consider "Zero Tillage" using herbicides if your land was previously farmed. It completely eliminates tractor costs and preserves soil moisture.'
WHERE id = 4;

-- Rich Markdown Body for Guide 5 (Labour)
UPDATE guides SET body_markdown = 
'# Optimizing Farm Labour Costs

Paying daily wages often leads to slower work. Agreeing on a price per acre or per row (piece-rate) incentivizes laborers to finish quickly and efficiently.

## Daily Wage vs. Task-Based
- **Daily Wage:** You pay for time. Workers may slow down to extend the job into a second day. Requires heavy supervision.
- **Task-Based:** You pay for results. Workers finish faster. Requires supervision only at the end to check quality.

## Maximizing Productivity
- Provide clean drinking water on the farm.
- Assign work early in the morning when it is cool.
- Clearly define the standard of work before they start (e.g., "all weeds must be uprooted, not just cut").

### Community Labor (Nnoboa)
The cheapest labor is shared labor. Group together with 4 other farmers and work on one person''s farm each day of the week. No cash changes hands.'
WHERE id = 5;

-- Rich Markdown Body for Guide 6 (Transport)
UPDATE guides SET body_markdown = 
'# Reducing Harvest Transportation Costs

Transporting half-empty trucks drastically increases your cost per bag. Consolidate your harvest or coordinate with neighbors.

## The Mathematics of Transport
If a tricycle (Aboboyaa) costs GHS 100 per trip and holds 10 bags, your cost is GHS 10/bag. If you only load 5 bags, your cost doubles to GHS 20/bag.

## How to lower transport costs
- **Dry on the farm:** Wet grains are heavier and bulkier. Drying crops on the farm reduces the volume you need to transport.
- **Road Maintenance:** A bad farm road means drivers charge "risk" prices. Spending one day fixing potholes on your farm road can save you hundreds of cedis in transport negotiations.
- **Off-Peak Movement:** Try not to transport on market days when every driver is busy and charging premium rates.

### Joint Hiring
Always talk to the neighboring farm before hiring a truck. Combining loads is the easiest way to cut transport costs by 50%.'
WHERE id = 6;

-- Rich Markdown Body for Guide 7 (Storage)
UPDATE guides SET body_markdown = 
'# Preventing Post-Harvest Storage Losses

Traditional jute sacks leave grains vulnerable to insects and moisture. Modern hermetic bags pay for themselves by completely stopping pest damage without chemicals.

## The Hidden Cost of Storage Pests
Weevils and borers can consume 20% of your stored maize in just 3 months. When you sell, buyers will severely discount insect-damaged grain.

## Hermetic Storage Bags (PICS)
- **How they work:** They have inner plastic linings that completely block oxygen. Any insects trapped inside suffocate and die within days.
- **No chemicals needed:** You save money on dusting chemicals and produce safer food.
- **Reusable:** If handled carefully (no punctures), they can be reused for up to 3 seasons.

### Storage Best Practices
- Never store bags directly on the concrete or earth floor. Use wooden pallets.
- Ensure grains are dried to exactly 13% moisture before sealing.'
WHERE id = 7;

-- Rich Markdown Body for Guide 8 (Record Keeping)
UPDATE guides SET body_markdown = 
'# The Importance of Good Record Keeping

Many farmers mix personal and farm money. Keep a strict log of every expense, no matter how small, so you can calculate your true profit at the end of the season.

## Treat your farm as a Business
If you take GHS 50 from your pocket to pay a laborer, that is a business expense. If you don''t record it, you will think you made a larger profit at harvest than you actually did.

## What to track
- **Inputs:** Seeds, fertilizer, chemicals
- **Labor:** Weeding, planting, harvesting (including family labor!)
- **Transport:** Bringing inputs to the farm and produce to the market
- **Yields:** How many bags harvested per acre

### Why FarmPilot?
Using FarmPilot to log these costs as they happen ensures you don''t forget them. At the end of the season, FarmPilot will give you an exact breakdown of where your money went, allowing you to cut wasteful spending next year.'
WHERE id = 8;
