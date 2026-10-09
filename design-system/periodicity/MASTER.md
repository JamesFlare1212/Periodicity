# Periodicity: an atlas of matter

Periodicity is a chemistry reference and exploration tool. Its primary job is to make the relationships between 118 elements visible, then let curious learners inspect and compare them. The periodic table itself is the opening visual.

## Direction and critique

The skill's first result suggested a generic education marketing page; the narrower result suggested neumorphism, an unrelated style. Neither matches a scientific reference. We retain the verified Svelte reactivity and keyboard guidance and define a subject-specific system instead: a dark scientific atlas, a disciplined table, and ten distinct family colors. We removed a proposed marketing hero and ornamental orbit motion. A static shell diagram explains structure and is explicitly a simplified model.

## Tokens

| Role           | Dark      | Light     |
| -------------- | --------- | --------- |
| Background     | `#10151e` | `#f5f7fa` |
| Surface        | `#171e29` | `#ffffff` |
| Raised surface | `#202a36` | `#edf1f5` |
| Primary text   | `#e9edf3` | `#1c2938` |
| Secondary text | `#a1adbd` | `#526172` |
| Accent         | `#9de1c6` | `#216b52` |

Space Grotesk carries the chemical symbols, titles, and wordmark. DM Sans carries navigation, labels, and descriptions. Fonts are served locally. Numeric properties use tabular figures. Family colors are semantic CSS tokens with independently paired light values.

## Layout

Desktop keeps all 18 groups visible. Selection occupies the table's natural empty space, rather than displacing its scientific geometry. A compact toolbar controls search, data display, and temperature. Category filters sit beneath the table. Every page has the same top navigation.

```text
wordmark           Explore / Trends / Compare        Calculator / Theme
The periodic table.                       brief context
search                         display          temperature
group labels 1 ......................................... 18
H             element preview in natural gap             He
Li Be         symbol / facts / simplified shell model     B ... Ne
...                 complete periodic table                 ...
                  lanthanides / actinides
family legend and filters                      reset
selection hint                                 project / source
```

Mobile defaults to a readable element grid. An explicit Table control exposes the complete scientific layout inside one labeled horizontal scroll region; the page itself never overflows. Detail, comparison, and formula pages reflow vertically. All content is left aligned except centered symbols and numeric cells.

## Interaction principles

- A visible click or keyboard action selects an element; focus previews it without requiring hover.
- Selected elements remain visible while pointer exploration updates a temporary preview.
- URLs encode useful filters, trends, comparisons, and formulas for sharing and browser history.
- Unknown properties remain unknown. Zero is a valid measurement.
- Temperature states are educational approximations at ordinary pressure, with missing data and exceptions explicitly acknowledged.
- Focus rings, native form controls, 44px controls, reduced motion, clear empty states, real source links, and both appearances are mandatory.
- No decorative gradients, motion loops, or repeated marketing cards. Color represents chemical families.
