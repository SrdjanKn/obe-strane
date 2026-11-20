# Obe strane: design plan ("Vaga")

**Subject.** A Serbian site that puts the same news story side by side as reported by pro-government and critical outlets, and shows what each side left out.
**Audience.** Readers in Serbia on both sides of the divide, plus journalists and researchers.
**Primary job.** Make the gap between the two camps visible at a glance, then let people read both sides at the original source.

## Concept: the scale and the seam

The site is a measuring instrument for the media, not a newspaper. Its signature is a **center seam**: a vertical zero line with pro-government always to its left and critical always to its right.

- Every coverage chart becomes a **two-sided meter** that grows outward from the seam. Pro-government (brick) extends left; critical (cobalt) extends right. The neutral groups (public broadcasters, in-between outlets, international) sit as a short grey block on the seam.
- On the story page, both "Kako su naslovili" and the timeline are laid out on either side of the seam.
- **Dashes mean absence.** Wherever one side stayed silent, the design draws a dashed outline instead of a filled one: the Slepe tačke panel, the silence meters, an empty half of a meter.

## Palette

| Name | Hex | Role |
|---|---|---|
| Tinta | `#1B1D2A` | Text and primary buttons; a blue-black printing ink rather than plain #111 |
| Beton | `#ECEEEC` | Panels, footer, meter tracks; cool concrete grey |
| Crvena | `#D0021B` | Pro-government (data). "Signal" set, replaced Cigla #A93A2B (read as generic terracotta) |
| Plava | `#0057B8` | Critical (data). "Signal" set |
| Signal žuta | `#F5B800` | Slepe tačke and silence: tab, dashed outlines, highlighter behind ink text. Never used as text (too light) |
| Grafit | `#555866` | Secondary text |

The data-only colors for the neutral groups stay as they are: public broadcasters `#7D6AA8`, in-between `#A9A69E`, international `#3F7F86`.

## Type

- **Noto Serif 700:** headlines. The client chose it; it is solid at the weights used and covers Serbian Latin and Cyrillic fully.
- **Source Sans 3:** body text and all interface text (also client-chosen). One family for everything that isn't a headline. Numbers use tabular figures so they line up in meters and tables.
- **DM Serif Display italic:** the "obe strane" wordmark only.
- **Scale:** major third (×1.25) from 17 px: 13.6 / 17 / 21 / 26.5 / 33 / 41.5 / 52.
- **Labels:** sentence case, semibold, Grafit. No all-caps tracked eyebrows anywhere.

## Layout

- **12-column grid:** content width 1240 px, 24 px gutters, text left-aligned. Centered alignment only on the seam itself.
- **Home:** a header strip showing today's balance on one meter, then the lead story, then the Slepe tačke panel.
```
| wordmark                  [ today: brick ◀━━━┃━━━▶ cobalt ]   search |
| sections ..............................................................|
| lead text (3) | lead photo + headline pair (5)  | Slepe tačke (4, dashed)|
| more stories: 3 columns                                                |
```
- **Story page:** a narrow text column for reading; the headline comparison and the timeline open up to the seam layout.
```
          provladini            ┃            kritički
   „headline“  Informer 10:15 ━━┫
                                ┣━━ 10:52 N1  „headline“
```
- **Dividers:** spacing and Beton panels instead of hairline rules. No 3 px black bars over sections. Rounded corners only on interactive controls (4 px buttons, pill-shaped filters); photos get a 3 px radius.

## Principles

1. **One bold place:** the seam and its two-sided meter. Everything around it stays quiet.
2. **Structure carries meaning:** left/right is the camp, dashes are silence, a filled shape is presence. No decoration without data behind it.
3. **Copy in plain Serbian:** natural phrases instead of strings joined by "·"; no "→" glued onto links.
4. **One orchestrated motion:** big meters grow out of the seam when a story opens; nothing else moves on its own. Respect reduced motion.

## Check against the brief: what I changed from my first draft

- I dropped the warm cream panels and the hairline broadsheet rules (the current site's look and a common generated default). Panels are now cool concrete grey, and the Slepe tačke panel uses a dashed outline, where the dashes carry meaning.
- I dropped the near-black footer for the same concrete grey, so the site doesn't close on a template dark band.
- I dropped all-caps tracked labels, "·" meta strings and "→" links.
- Instead of a generic hero, the home page leads with the day's balance on the seam meter: the most characteristic thing about this product.
