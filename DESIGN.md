# Design

Since 2026-11-19 this app uses the shared **Dashboard shell**: rules, pieces and the move recipe are in
[`DASHBOARD.md`](DASHBOARD.md). The earlier one-off look ("Split Room", paper and acid green) was retired so every
data page on `*.bookchaowalit.com` reads the same way; see git history for its old design notes.

It is the shell's calculator form: four stat tiles, a Variants panel whose static rows each carry the rate, a
share bar (rate against the best variant), a labelled `ds-range` weight slider with its value printed and a plain
"Add conversion" button, and a Traffic panel with the one filled button. App-specific CSS (prefix `ab-`) lays the
slider out under each row and moves the Traffic panel above the list in one column, so Simulate stays in reach.
