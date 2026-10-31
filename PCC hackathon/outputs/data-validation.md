# Launchpoint data validation

Audit date: October 30, 2026 (Pacific Time). See `data-validation.json` for the timestamped checks and individual records.

## Result

The core data flow and geographic calculations pass validation. A fresh exact launch-time confirmation, actual webcast playback, device GPS accuracy, and campus sightlines are not all verified.

| Area | Result | Evidence / limit |
| --- | --- | --- |
| Globe launch-site coordinates | Pass | All 27 curated sites match their corresponding GCAT reference coordinates. These are site centers, not every individual pad. |
| PCC-to-pad geometry | Pass | PCC reference point to SLC-4E: 235.034 km, initial true-north bearing 284.044° (WNW). |
| Map tile endpoints | Pass | Representative PCC and SLC-4E tiles returned HTTP 200 with image/png. |
| Next launch record | Saved record validated; fresh check limited | Starlink Group 15-18, SLC-4E, target October 30 at 9:02:22 PM PDT. Saved source snapshot was fetched at 1:30:59 PM PDT. This is inside the published 8:48 PM–12:48 AM PDT window. Fresh upcoming/recent API requests returned HTTP 429; they were not retried during the limit. |
| Official mission page | Partial independent confirmation | SpaceX's mission page loaded and identifies Starlink and SLC-4E at Vandenberg, with a countdown. The visible paragraph did not expose an explicit timestamp for an independent exact-time comparison. |
| Schedule records | Structural pass | Five upcoming and five previous saved records were checked. Provisional month/year/quarter targets do not get a fabricated precise countdown. |
| Videos | Metadata / embed configuration pass | All 14 unique saved YouTube links returned HTTP 200 and iframe embed markup. This does not guarantee playback in every browser, region, or future session. |
| Next mission's video page | Scheduled, playback unverified | YouTube's page title matches Starlink 15-18. It displays October 30 at 8:50 PM and “Live in 7 hours.” The player also reports “Unable to play media.” An actual playing webcast has not been verified. The community stream's start time is distinct from the rocket's target liftoff time. |
| Weather integration | Pass at audit time | Open-Meteo returned HTTP 200 and valid launch-hour cloud-cover samples for public PCC/pad coordinates. These are forecasts, not visibility guarantees; they change as models update. |
| Device location | Requires device test | Browser permission, error, timeout, accuracy display, campus-distance handling, and reset paths were reviewed in code. No device location was requested or collected in this audit. Accuracy and permission behavior still need checking on the user's actual phone/browser. |
| Campus spots | Unverified | Three pins remain approximate candidate locations. The official campus map establishes campus features, but nighttime access, exact standing locations, trees/buildings, and clear western sightlines require an on-site check. |

## Fixes made during validation

- Corrected coarse calendar dates so UTC-to-Pacific conversion cannot shift a provisional target into the previous month/day. Year-only and quarter-only dates retain their stated precision.
- Added full cached-record validation for coordinates, dates, source links, and webcast metadata. Damaged cached entries fall back to the saved source snapshot.
- Made optional provider metadata handling tolerate malformed entries without losing the whole schedule.
- Removed the unused, obsolete 8:48 PM demo target from the code.

Production build: passed. Automated checks: **12 passed, 0 failed**.

## Sources

- GCAT sites catalog: https://planet4589.org/space/gcat/tsv/tables/sites.tsv
- Catalog coordinate definitions: https://planet4589.org/space/gcat/web/sites/index.html
- Mission page: https://www.spacex.com/launches/sl-15-18
- Launch service: https://ll.thespacedevs.com/docs
- Campus map: https://pasadena.edu/about/documents/PCC_map.pdf
- Next mission's community coverage: https://www.youtube.com/watch?v=OVOVtaf15eY
- Weather API: https://open-meteo.com/en/docs

For a larger deployment, put launch-service polling behind a shared server cache so each visitor does not consume the source's public quota independently.
