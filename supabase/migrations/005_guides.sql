-- ============================================================
-- MIGRATION 005: Guides & Guidance Library
-- ============================================================

-- ---------- 1. Guides Table ----------
create table guides (
  id                  bigserial primary key,
  category            cost_category not null,
  crop_id             bigint references crops(id) on delete set null,
  title               text not null,
  summary             text not null,
  body_markdown       text not null,
  region              text,
  season_window       season_window,
  source              text not null,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ---------- 2. Guide Steps Table ----------
create table guide_steps (
  id                  bigserial primary key,
  guide_id            bigint not null references guides(id) on delete cascade,
  position            integer not null,
  heading             text not null,
  detail              text not null,
  unique (guide_id, position)
);

-- ---------- 3. RLS Policies ----------
alter table guides enable row level security;
alter table guide_steps enable row level security;

-- Read for authenticated, no write policies
create policy ref_read_guides on guides for select to authenticated using (true);
create policy ref_read_guide_steps on guide_steps for select to authenticated using (true);

-- ---------- 4. Seeding Guides ----------
-- Guide 1: Fertiliser
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(1, 'fertiliser', null, 'Accessing Government Fertilizer Subsidies', 'Government subsidies can halve the cost of NPK and Urea. Learn how and when to apply.', 'Missing the subsidy window is the most common avoidable overspend for farmers. Subsidies are typically allocated before the major season begins, so early registration is critical. Contact your local District Agricultural Department early in the year.', null, null, 'Ministry of Food and Agriculture (MoFA) PFJ Program Guidelines (Verify exact dates locally)');

insert into guide_steps (guide_id, position, heading, detail) values
(1, 1, 'Register with the District Assembly', 'Visit your district MoFA office with your Ghana Card to register as a farmer under the subsidy program.'),
(1, 2, 'Monitor Subsidy Announcements', 'Listen to local radio or check with your extension officer in January/February for the official opening of the subsidy window.'),
(1, 3, 'Purchase through Approved Input Dealers', 'Only buy from certified dealers who are authorized to sell subsidized fertilizer. Ask to see their certificate.');

-- Guide 2: Seeds
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(2, 'seeds', null, 'Sourcing Certified High-Yield Seeds', 'Using certified seeds improves germination rates and overall yield, making the upfront cost worthwhile.', 'Farmers often save seeds from previous harvests to cut costs, but this leads to diminishing yields over time. Certified seeds are bred for disease resistance and climate resilience.', null, null, 'CSIR-Crops Research Institute');

insert into guide_steps (guide_id, position, heading, detail) values
(2, 1, 'Identify Certified Seed Producers', 'Buy from recognized seed companies or MoFA-approved outgrowers rather than the open market.'),
(2, 2, 'Check the Certification Tag', 'Look for the official certification tag on the seed bag to guarantee quality and germination rates.'),
(2, 3, 'Test Germination Before Planting', 'Test a small sample of seeds in a wet cloth a few days before planting to ensure they are viable.');

-- Guide 3: Agrochem
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(3, 'agrochem', null, 'Effective Pesticide and Herbicide Application', 'Applying chemicals at the right time and dilution saves money and protects your crops.', 'Over-applying agrochemicals is a common waste of money and harms the soil. Always follow the manufacturer''s dosage instructions exactly.', null, null, 'EPA Ghana Agrochemical Use Guidelines');

insert into guide_steps (guide_id, position, heading, detail) values
(3, 1, 'Identify the Specific Pest/Weed', 'Do not use broad-spectrum chemicals if a targeted, cheaper option is available.'),
(3, 2, 'Calibrate Your Knapsack Sprayer', 'Ensure your sprayer nozzle is not worn out, which leads to wasting expensive chemicals.'),
(3, 3, 'Spray at the Right Time of Day', 'Spray early in the morning or late evening. Mid-day heat causes chemicals to evaporate before they work.');

-- Guide 4: Land Prep
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(4, 'land_prep', null, 'Cost-Effective Land Preparation', 'Minimize tractor hours by timing your plowing correctly with the first rains.', 'Plowing bone-dry soil takes more time, fuel, and tractor hours. Waiting for the first rains softens the soil and significantly reduces land preparation costs.', null, null, 'Agricultural Engineering Services Directorate (MoFA)');

insert into guide_steps (guide_id, position, heading, detail) values
(4, 1, 'Wait for the First Rains', 'Let the soil soften. This makes tractor work faster and cheaper.'),
(4, 2, 'Clear Large Stumps Manually', 'Removing large obstacles beforehand prevents tractor damage and speeds up plowing.'),
(4, 3, 'Group Plowing with Neighbors', 'Hire a tractor together with neighboring farms to negotiate a lower per-acre rate.');

-- Guide 5: Labour
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(5, 'labour', null, 'Optimizing Farm Labour Costs', 'Switch from daily wages to piece-rate or task-based contracts to improve productivity.', 'Paying daily wages often leads to slower work. Agreeing on a price per acre or per row incentivizes laborers to finish quickly and efficiently.', null, null, 'Farm Management Best Practices (Verify local daily wage rates)');

insert into guide_steps (guide_id, position, heading, detail) values
(5, 1, 'Use Task-Based Contracts', 'Pay per acre or per task (e.g., weeding one plot) rather than a flat daily rate.'),
(5, 2, 'Provide Early Morning Supervision', 'Workers are most productive in the cool early hours. Ensure tasks are clearly assigned by 6 AM.'),
(5, 3, 'Organize Nnoboa (Communal Labor)', 'Work with other farmers in a cooperative labor-sharing system to eliminate cash wage costs entirely.');

-- Guide 6: Transport
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(6, 'transport', null, 'Reducing Harvest Transportation Costs', 'Coordinate transport to ensure trucks are fully loaded to minimize per-bag transport fees.', 'Transporting half-empty trucks drastically increases your cost per bag. Consolidate your harvest or coordinate with neighbors.', null, null, 'Agribusiness Transport Optimization Guidelines');

insert into guide_steps (guide_id, position, heading, detail) values
(6, 1, 'Consolidate Loads', 'Ensure you have enough harvested bags to fill a standard tricycle (Aboboyaa) or truck before hiring.'),
(6, 2, 'Negotiate Off-Peak Rates', 'Try to arrange transport slightly before or after the peak harvest rush when drivers charge premium rates.'),
(6, 3, 'Improve Farm Access', 'Clear the path to your farm. Drivers charge higher rates if the road damages their vehicles.');

-- Guide 7: Storage
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(7, 'storage', null, 'Preventing Post-Harvest Storage Losses', 'Invest in hermetic storage bags (e.g., PICS bags) to avoid chemical dusts and prevent weevil damage.', 'Traditional jute sacks leave grains vulnerable to insects and moisture. Modern hermetic bags pay for themselves by completely stopping pest damage without chemicals.', null, null, 'Post-Harvest Loss Prevention Program (MoFA)');

insert into guide_steps (guide_id, position, heading, detail) values
(7, 1, 'Dry Grains Properly', 'Ensure grains are dried to the correct moisture content before bagging to prevent mold.'),
(7, 2, 'Use Hermetic Bags', 'Buy PICS bags or similar airtight storage solutions. They suffocate any insects trapped inside.'),
(7, 3, 'Store on Pallets', 'Never place bags directly on the bare floor. Use wooden pallets to prevent moisture seeping in from below.');

-- Guide 8: Record Keeping (Categorized as 'other')
insert into guides (id, category, crop_id, title, summary, body_markdown, region, season_window, source) values
(8, 'other', null, 'The Importance of Good Record Keeping', 'Tracking every pesewa is the only way to know if your farm is truly profitable.', 'Many farmers mix personal and farm money. Keep a strict log of every expense, no matter how small, so you can calculate your true profit at the end of the season.', null, null, 'Farm Business Management Training');

insert into guide_steps (guide_id, position, heading, detail) values
(8, 1, 'Record Daily', 'Do not wait until the end of the week. Enter costs into FarmPilot the same day they happen.'),
(8, 2, 'Keep Receipts', 'Keep physical receipts or take photos of them for larger purchases like fertilizer.'),
(8, 3, 'Separate Farm and Personal Money', 'Never use money from your farm sales to buy personal items without recording it as a formal withdrawal.');

SELECT setval('guides_id_seq', 8);
