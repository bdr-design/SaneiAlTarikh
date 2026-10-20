# Credits and data sources (design phase)

## Imagery and terrain used in the map mockups
- **NASA Blue Marble** satellite imagery (public domain). Credit: NASA Earth Observatory / Reto Stöckli. Tiles read from the Modest Maps mirror `s3.amazonaws.com/com.modestmaps.bluemarble` (a third-party copy of the NASA imagery). Use of NASA imagery does not imply NASA endorsement.
- **Terrain Tiles** (Terrarium encoding, `s3.amazonaws.com/elevation-tiles-prod`). Used for relief shading and sea depth. Required attribution (from tilezen/joerd `docs/attribution.md`):

```
* ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and
  funded under National Science Foundation awards 1043681, 1559691, and 1542736;
* Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;
* Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM)
  Österreich;
* Canada terrain data contains information licensed under the Open Government
  Licence – Canada;
* Europe terrain data produced using Copernicus data and information funded by the
  European Union - EU-DEM layers;
* Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration
* Mexico terrain data source: INEGI, Continental relief, 2016;
* New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New
  Zealand and the New Zealand Government (All rights reserved);
* Norway terrain data © Kartverket;
* United Kingdom terrain data © Environment Agency copyright and/or database right
  2015. All rights reserved;
* United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data
  courtesy of the U.S. Geological Survey.
```

The z4 and z6 tiles used here (312 tiles) are built only from **ETOPO1** (NOAA) and **GMTED2010** (USGS), per each tile's `x-amz-meta-x-imagery-sources` header, checked 2026-10-20. The per-tile list is in `evidence/terrain_tile_sources_2026-10-20.txt`. None of the providers marked "All rights reserved" above appear in these tiles.

`design/shared/world_d1.jpg`, `design/shared/map_mena_d1.jpg` and the screen renders that show them are derived mainly from US Government works (NASA, NOAA, USGS), which carry no copyright. The project claims rights only in its own changes (grading, borders, labels and layout).

## Vector data
- **Natural Earth** (public domain): admin-0, admin-1, disputed areas.
- Edited for 1 Jan 2011: one Sudan, and Crimea in Ukraine.

## Flags
- **flag-icons** v7.2.3 by Panayiotis Lipiridis, MIT licence: `design/shared/LICENSE-flag-icons.txt`. The files match v7.2.3 byte for byte; do not re-pull from upstream `main`, which changed several flags, including Syria's post-2024 flag.
- Flags and state emblems may also be restricted by national flag laws. They identify countries in the game UI only; they are not for marketing art.
- `design/shared/flags/ly_2011.svg` (the plain green 2011 flag of Libya) was drawn for this project.

## Font
- **IBM Plex Sans Arabic**, SIL Open Font License 1.1: `design/shared/OFL-IBMPlexSansArabic.txt`.
- The font files are not included. The mockups load the installed font.

## Game images
- The images in `design/generated/`, `design/shared/scenarios/` and `design/shared/menu_background.png` were made by the project owner for this game with ChatGPT (OpenAI), on a paid plan.
- The generator and its commercial-use terms are recorded per image under the project's artwork rule (`design_doc/final_design.md` §4.1).
