# Chlorides report boundaries

`chlorides_report_regions.geojson` is the shared WGS84 definition used by the
report API, PDF metadata, report map, and well-management map guide. GeoJSON
coordinates are longitude first. The five anchors preserve the supplied DMS
coordinates without rounding. The outer rectangle uses the west/east anchor
longitudes and south/north anchor latitudes.

The four dividers follow NMDOT's primary-direction road geometry. Main Street is
recorded as FL4685P through the supplied center, connecting to US285P north and
south. The western US 380 segment is recorded under concurrent US70P; US380P
supplies the remainder. Short connectors at anchors preserve the supplied exact
points and avoid tiny intersection spurs from differing road alignments.

The GeoJSON records its source URL, route identifiers, retrieval date, and
boundary version. Road geometry is checked in: production reports never query
NMDOT. Region polygons partition the entire rectangle. Measurements exactly on
285 go east; those exactly on 380 go north; the center goes northeast. A 1e-10
degree tolerance handles floating-point roundoff on shared dividers, while the
outer rectangle is checked strictly and inclusively. Counts are measurements,
not distinct wells. The new geometry applies to every requested date range;
measurements and stored chloride groups are not migrated.

To reproduce version 2026-10-13-v1, download the NMDOT route service as GeoJSON
with all fields and WGS84 output, then run from the repository root:

```bash
curl -L 'https://gis.dot.nm.gov/epermit/rest/services/EGIS/EgisViewerLrs/MapServer/0/query?where=1%3D1&geometry=-104.76%2C33.12%2C-104.24%2C33.63&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=*&outSR=4326&f=geojson' -o /tmp/chlorides-highways.json
python scripts/build_chlorides_geometry.py /tmp/chlorides-highways.json
python -m pytest api/tests/test_chlorides_report.py -q
```

The upstream network may change. When intentionally refreshing its geometry,
update the version/retrieval date in the generator, inspect the resulting map,
and run the partition, classification, date-range, and report tests. Deploy the
API with Shapely installed before deploying the frontend that requests
`GET /chlorides/report/geometry` (requires the existing read permission).
