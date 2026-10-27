import json
from pathlib import Path
from shapely.geometry import LineString, Point, Polygon, mapping, box
from shapely.ops import substring, nearest_points, unary_union
from shapely.validation import explain_validity

# Download NMDOT MapServer/0/query as GeoJSON with outSR=4326, then pass its path.
import argparse

parser = argparse.ArgumentParser(
    description="Build the checked-in chloride boundary geometry from NMDOT routes"
)
parser.add_argument("source", type=Path)
args = parser.parse_args()
source = json.loads(args.source.read_text())


def lines(route):
    f = next(f for f in source["features"] if f["properties"]["RouteId"] == route)
    c = f["geometry"]["coordinates"]
    return [
        LineString([v[:2] for v in line])
        for line in (c if f["geometry"]["type"] == "MultiLineString" else [c])
    ]


def nearest_line(route, p):
    return min(lines(route), key=lambda line: line.distance(Point(p)))


def segment(line, a, b):
    return list(substring(line, line.project(Point(a)), line.project(Point(b))).coords)


def join(*parts):
    out = []
    for part in parts:
        for p in part:
            p = list(p)
            if not out or out[-1] != p:
                out.append(p)
    return out


raw = {
    "center": (33, 23, 39.28, 104, 31, 21.82),
    "north": (33, 37, 28.26, 104, 32, 48.43),
    "south": (33, 7, 28.71, 104, 26, 33.97),
    "west": (33, 22, 49.71, 104, 45, 3.27),
    "east": (33, 24, 50.86, 104, 14, 45.48),
}
anchors = {
    k: [-(d + e / 60 + f / 3600), a + b / 60 + c / 3600]
    for k, (a, b, c, d, e, f) in raw.items()
}
c = anchors["center"]
main = lines("FL4685P")[0]
main_s = list(main.coords)[0]
main_n = list(main.coords)[-1]
north = nearest_line("US285P", anchors["north"])
south = nearest_line("US285P", anchors["south"])
east = nearest_line("US380P", c)
west = nearest_line("US70P", anchors["west"])
# Join the concurrent US70/380 segment to US380 at their western junction.
wjoin, ejoin = nearest_points(west, Point(list(east.coords)[0]))
paths = {
    "north": join(
        [c],
        segment(main, c, main_n),
        segment(north, main_n, anchors["north"]),
        [anchors["north"]],
    ),
    "south": join(
        [c],
        segment(main, c, main_s),
        segment(south, main_s, anchors["south"]),
        [anchors["south"]],
    ),
    "west": join(
        [c],
        segment(east, c, ejoin),
        segment(west, wjoin, anchors["west"]),
        [anchors["west"]],
    ),
    "east": join([c], segment(east, c, anchors["east"]), [anchors["east"]]),
}
for k, path in paths.items():
    # Replace nearby road vertices with exact anchors to avoid tiny crossing spurs.
    # Restrict road vertices to the outer rectangle before constructing region rings.
    path = (
        [c]
        + [
            p
            for p in path[1:-1]
            if Point(p).distance(Point(c)) > 0.0004
            and Point(p).distance(Point(anchors[k])) > 0.0004
            and anchors["west"][0] < p[0] < anchors["east"][0]
            and anchors["south"][1] < p[1] < anchors["north"][1]
        ]
        + [anchors[k]]
    )
    paths[k] = path
    line = LineString(path)
    assert line.is_simple, (k, "self intersection")
    print(
        k,
        len(path),
        "max segment",
        max(LineString([a, b]).length for a, b in zip(path, path[1:])),
    )
w, s, e, n = (
    anchors["west"][0],
    anchors["south"][1],
    anchors["east"][0],
    anchors["north"][1],
)
rect = box(w, s, e, n)
rings = {
    "north_west": join(paths["north"], [[w, n]], list(reversed(paths["west"]))),
    "north_east": join(paths["east"], [[e, n]], list(reversed(paths["north"]))),
    "south_west": join(paths["west"], [[w, s]], list(reversed(paths["south"]))),
    "south_east": join(paths["south"], [[e, s]], list(reversed(paths["east"]))),
}
polys = {k: Polygon(r) for k, r in rings.items()}
for k, p in polys.items():
    print(k, explain_validity(p))
assert all(p.is_valid for p in polys.values())
assert unary_union(list(polys.values())).symmetric_difference(rect).area < 1e-12
assert abs(sum(p.area for p in polys.values()) - rect.area) < 1e-12
features = []
for k, p in polys.items():
    features.append(
        {
            "type": "Feature",
            "properties": {
                "kind": "region",
                "id": k,
                "label": k.replace("_", " ").title(),
                "label_position": list(p.representative_point().coords)[0],
            },
            "geometry": mapping(p),
        }
    )
for k, p in paths.items():
    features.append(
        {
            "type": "Feature",
            "properties": {
                "kind": "divider",
                "id": k,
                "label": "Hwy. 285" if k in ("north", "south") else "Hwy. 380",
            },
            "geometry": mapping(LineString(p)),
        }
    )
for k, p in anchors.items():
    a, b, sec, d, e2, f = raw[k]
    features.append(
        {
            "type": "Feature",
            "properties": {
                "kind": "anchor",
                "id": k,
                "label": k.title(),
                "coordinate_label": f"N {a}°{b:02d}′{sec:05.2f}″, W {d}°{e2:02d}′{f:05.2f}″",
            },
            "geometry": mapping(Point(p)),
        }
    )
geo = {
    "type": "FeatureCollection",
    "version": "2026-10-13-v1",
    "description": "Four highway-based regions around the Hwy. 285 / Hwy. 380 center in Roswell; rectangular outer limits set by the four endpoints.",
    "source": "https://gis.dot.nm.gov/epermit/rest/services/EGIS/EgisViewerLrs/MapServer/0",
    "source_routes": ["FL4685P", "US285P", "US380P", "US70P"],
    "source_retrieved": "2026-10-13",
    "route_note": "Main Street connects the supplied center to US 285; US 70 supplies the concurrent western US 380 segment. Primary-direction road geometry is used, with short connectors to exact supplied anchors.",
    "bbox": [w, s, e, n],
    "features": features,
}
Path("api/data/chlorides_report_regions.geojson").write_text(
    json.dumps(geo, ensure_ascii=False, indent=2) + "\n"
)
