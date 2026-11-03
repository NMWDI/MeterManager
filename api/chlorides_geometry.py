"""Shared, versioned highway boundaries for the chloride report and map."""

import json
from math import isfinite
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.prepared import prep

GEOMETRY = json.loads(
    (Path(__file__).parent / "data" / "chlorides_report_regions.geojson").read_text()
)
REPORT_BOUNDS = tuple(GEOMETRY["bbox"])
REGIONS = {
    feature["properties"]["id"]: shape(feature["geometry"])
    for feature in GEOMETRY["features"]
    if feature["properties"]["kind"] == "region"
}
PREPARED_REGIONS = {key: prep(region) for key, region in REGIONS.items()}
DIVIDERS = {
    feature["properties"]["id"]: shape(feature["geometry"])
    for feature in GEOMETRY["features"]
    if feature["properties"]["kind"] == "divider"
}
ANCHORS = [
    feature
    for feature in GEOMETRY["features"]
    if feature["properties"]["kind"] == "anchor"
]
# Boundary ties go east on 285 and north on 380; the center goes northeast.
REGION_PRIORITY = ("north_east", "north_west", "south_east", "south_west")


def classify_location(latitude: float, longitude: float) -> str | None:
    if not isfinite(latitude) or not isfinite(longitude):
        return None
    west, south, east, north = REPORT_BOUNDS
    if not (west <= longitude <= east and south <= latitude <= north):
        return None
    point = Point(longitude, latitude)
    # Interpolated points on a segment can differ by floating-point roundoff.
    # This sub-millimeter tolerance resolves ties without moving the outer limits.
    for direction, region in (
        ("north", "north_east"),
        ("east", "north_east"),
        ("south", "south_east"),
        ("west", "north_west"),
    ):
        if DIVIDERS[direction].distance(point) <= 1e-10:
            return region
    return next(
        (key for key in REGION_PRIORITY if PREPARED_REGIONS[key].covers(point)), None
    )
