# Element data

`element-records.json` preserves the two datasets used by the original Periodicity app, joined by atomic number. Every original record is retained so migrating the application does not replace its scientific reference data.

- `general` is the original `src/assets/elementGeneral.json`, derived from [Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON). It provides the summaries, sources, table positions, shells, appearance, discoverers, and molar heat.
- `properties` is the exact [periodic-table 0.0.8](https://www.npmjs.com/package/periodic-table/v/0.0.8) dataset formerly imported by `src/elements.js`. Its license is preserved in `periodic-table-LICENSE.txt`. It provides atomic mass, electron configuration, numerical chemical properties, discovery dates, bonding type, and recorded standard state.

`elements.ts` applies the former `src/elements.js` measurement corrections and rounds stable atomic weights to three decimal places, as before. Representative isotope mass numbers remain integers. The source’s density values are already in **g/cm³**, including gases; the other dataset uses different units for gases and is deliberately not used for this property. Unknown measurements are `null`, while measured zero electron affinities are preserved.

Family membership follows the explicit lists in the original UI, including polonium as a metalloid, astatine and tennessine as halogens, and all 15 members of each detached f-block row. These are display conventions, especially for predicted heavy-element families, rather than a claim that every category is universally agreed.

The source’s 19 unrecorded heavy-element standard states remain `unknown`. The second dataset’s predicted solid/gas states are retained in the raw data but are not presented as established measurements.

## Temperature estimates

The temperature view is an educational estimate using the source’s transition temperatures. It does not simulate pressure, allotropes, plasma, or phase equilibria. Missing transitions create unknown intervals. The inverted arsenic pair (melting 1090 K, boiling 887 K) is treated as sublimation, so the UI never predicts a liquid interval for it. At 298.15 K or 273.15 K, a recorded standard state can supply an otherwise missing result.

The legacy measurements are intentionally preserved; a future scientific dataset update should be reviewed independently of the UI migration.
