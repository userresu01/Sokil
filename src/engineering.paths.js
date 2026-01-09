// engineering.paths.js
// viewBox for the engineering scheme image: 1151 x 766
// We keep the same style as zones.paths.js: export const zones = [{id,name,d},...]
// Here "lines" are also stored as SVG paths (open paths are OK for hover/click).

export const features = [
  // --- Main polygon zone (the only filled area) ---
  {
    id: "z00",
    name: "Zone 00",
    d: "M354.5 563L317 588L291 538.5L259.5 508.5L279.5 451L291 446L434 451L430.5 563H366H354.5Z",
  },

  // --- Lines (clickable) ---
  {
    id: "l01",
    name: "Line 01",
    d: "M369 559.5L485.5 562L517.5 543.5L535.5 361.5",
  },
  {
    id: "l02",
    name: "Line 02",
    d: "M371 567L672 571.5L971.5 565.5",
  },

  // This one is the “segmented / dashed-looking” line in SVG data (many small segments).
  // In your UI it will still be clickable as ONE object, because it's one path string.
  {
    id: "l03",
    name: "Line 03",
    d: "M370 560L390 558M403 558L417.5 555.5M430 554.5L446 552.5M459 551L474 549.5M486 548.5L502.5 546.5M517 546H530.5M543 546.5L558 547M570.5 548L585.5 548.5M598.5 549.5L614.5 550.5M626 550.5L642.5 552M654.5 552L671 553.5M682.5 553.5L700 554.5M710.5 553.5H727.5M737 553.5H755.5M766.5 553.5H784M794 552.5H810.5M814.5 541L821 526M827 516L831.5 513H841.5M853 516L869 518M881 520L897.5 523M908.5 524.5L925 527M930 519L932.5 503.5M934.5 492L937 476M939.5 463.5L941.5 448",
  },

  {
    id: "l04",
    name: "Line 04",
    d: "M381.5 544L394 498L405.5 452.5L412 427",
  },
];