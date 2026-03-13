/*
  Meter Readings Export (Hydrologist-Friendly CSV)

  This query exports all "Meter reading" observations from the
  MeterObservations table in a format suitable for non-technical
  users (hydrologists, consultants, regulators).

  - Reading Date is formatted as YYYY-MM-DD (date only)
  - Reading Value and Reading Unit are in separate columns
  - Well and Location identifiers are human-readable (no DB IDs)
  - Includes Meter ID for traceability (optional, but helpful)
  - Join to Wells is performed via shared Location (w.location_id = mo.location_id)
*/
SELECT
  "Well Name",
  "RA Number",
  "Well Depth (ft)",
  "Meter Reading Date",
  "Meter Reading Value",
  "Meter Reading Unit",
  "Parameter",
  "Location Name",
  "Latitude",
  "Longitude",
  "Location Geometry (WKT)",
  "Meter ID"
FROM (
  SELECT
    l.name                                       AS "Location Name",
    w.name                                       AS "Well Name",
    w.ra_number                                  AS "RA Number",
    w.total_depth                                AS "Well Depth (ft)",
    to_char(mo."timestamp"::date, 'YYYY-MM-DD')  AS "Meter Reading Date",
    opt.name                                     AS "Parameter",
    mo.value                                     AS "Meter Reading Value",
    u.name_short                                 AS "Meter Reading Unit",
    l.latitude                                   AS "Latitude",
    l.longitude                                  AS "Longitude",
    ST_AsText(l.geom)                            AS "Location Geometry (WKT)",
    mo.meter_id                                  AS "Meter ID"
  FROM public."MeterObservations" mo
  JOIN public."Units" u
    ON u.id = mo.unit_id
  JOIN public."ObservedPropertyTypeLU" opt
    ON opt.id = mo.observed_property_type_id
  JOIN public."Locations" l
    ON l.id = mo.location_id
  JOIN public."Wells" w
    ON w.location_id = mo.location_id
  WHERE mo.observed_property_type_id = 1 -- Meter reading
) t
ORDER BY
  t."Meter Reading Date" ASC,
  t."Well Name" ASC,
  t."Location Name" ASC;

