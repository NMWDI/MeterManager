/*
  Chloride Concentration Results Export (Hydrologist-Friendly CSV)

  This query exports all chloride concentration sample results
  from the WellMeasurements table in a format suitable for
  non-technical users (hydrologists, consultants, regulators).

  - Sample Result Date is formatted as YYYY-MM-DD (date only)
  - Result Value and Result Unit are in separate columns
  - Well and Location identifiers are human-readable (no DB IDs)
  - Geometry is exported as WKT for GIS compatibility
*/
SELECT
  "Well Name",
  "RA Number",
  "Sample Result Date",
  "Sample Result Value",
  "Sample Result Unit",
  "Parameter",
  "Casing",
  "Total Depth",
  "Location Name",
  "Latitude",
  "Longitude",
  "Location Geometry (WKT)"
FROM (
  SELECT
    l.name                              AS "Location Name",
    w.name                              AS "Well Name",
    w.ra_number                         AS "RA Number",
    w.casing                              AS "Casing",
    w.total_depth                         AS "Total Depth",
    to_char(wm."timestamp"::date, 'YYYY-MM-DD') AS "Sample Result Date",
    opt.name                            AS "Parameter",
    wm.value                            AS "Sample Result Value",
    u.name_short                        AS "Sample Result Unit",
    l.latitude                          AS "Latitude",
    l.longitude                         AS "Longitude",
    ST_AsText(l.geom)                   AS "Location Geometry (WKT)"
  FROM public."WellMeasurements" wm
  JOIN public."Units" u
    ON u.id = wm.unit_id
  JOIN public."ObservedPropertyTypeLU" opt
    ON opt.id = wm.observed_property_id
  JOIN public."Wells" w
    ON w.id = wm.well_id
  JOIN public."Locations" l
    ON l.id = w.location_id
  WHERE wm.observed_property_id = 5
) t
ORDER BY
  t."Sample Result Date" ASC,
  t."Well Name" ASC,
  t."Location Name" ASC;
