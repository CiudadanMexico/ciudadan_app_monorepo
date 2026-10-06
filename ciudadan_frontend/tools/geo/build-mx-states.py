#!/usr/bin/env python3
"""build-mx-states.py — Genera los assets geográficos de México para GeoNetworkMap.

FUENTE OFICIAL (INEGI · Servicio Web del Catálogo Único de Claves Geoestadísticas)
  - Catálogo AGEE (tabular)      : https://gaia.inegi.org.mx/wscatgeo/v2/mgee/
  - Marco Geoestadístico (vector): https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/
  Metadatos declarados por el propio servicio:
      "INEGI. Marco Geoestadístico, diciembre de 2025"

SALIDAS
  src/data/geo/mx/states.geo.json    geometría + identidad mínima (sin descargas en runtime)
  src/data/geo/mx/states.meta.json   metadata geográfica + offsets de labels

USO
  python3 tools/geo/build-mx-states.py                    # descarga la fuente y regenera
  python3 tools/geo/build-mx-states.py --cached /tmp/geo  # usa copias locales ya descargadas
  python3 tools/geo/build-mx-states.py --tolerance 0.005  # ajusta la simplificación (grados)

Solo usa la librería estándar de Python 3.
"""
import argparse
import json
import math
import os
import urllib.request

INEGI_CAT = 'https://gaia.inegi.org.mx/wscatgeo/v2/mgee/'
INEGI_GEO = 'https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/'
UA = {'User-Agent': 'ciudadan-geo-build/1.0'}

# cve_ent (INEGI) -> (ISO 3166-2:MX, slug, nombre corto para labels, abreviatura oficial)
# Elaborado cruzando el catálogo oficial INEGI (nomgeo/nom_abrev) con la norma ISO 3166-2:MX.
REGIONS = {
    '01': ('MX-AGU', 'aguascalientes', 'Aguascalientes', 'Ags.'),
    '02': ('MX-BCN', 'baja-california', 'Baja California', 'BC'),
    '03': ('MX-BCS', 'baja-california-sur', 'Baja California Sur', 'BCS'),
    '04': ('MX-CAM', 'campeche', 'Campeche', 'Camp.'),
    '05': ('MX-COA', 'coahuila', 'Coahuila', 'Coah.'),
    '06': ('MX-COL', 'colima', 'Colima', 'Col.'),
    '07': ('MX-CHP', 'chiapas', 'Chiapas', 'Chis.'),
    '08': ('MX-CHH', 'chihuahua', 'Chihuahua', 'Chih.'),
    '09': ('MX-CMX', 'ciudad-de-mexico', 'Ciudad de México', 'CDMX'),
    '10': ('MX-DUR', 'durango', 'Durango', 'Dgo.'),
    '11': ('MX-GUA', 'guanajuato', 'Guanajuato', 'Gto.'),
    '12': ('MX-GRO', 'guerrero', 'Guerrero', 'Gro.'),
    '13': ('MX-HID', 'hidalgo', 'Hidalgo', 'Hgo.'),
    '14': ('MX-JAL', 'jalisco', 'Jalisco', 'Jal.'),
    '15': ('MX-MEX', 'mexico', 'Estado de México', 'Méx.'),
    '16': ('MX-MIC', 'michoacan', 'Michoacán', 'Mich.'),
    '17': ('MX-MOR', 'morelos', 'Morelos', 'Mor.'),
    '18': ('MX-NAY', 'nayarit', 'Nayarit', 'Nay.'),
    '19': ('MX-NLE', 'nuevo-leon', 'Nuevo León', 'NL'),
    '20': ('MX-OAX', 'oaxaca', 'Oaxaca', 'Oax.'),
    '21': ('MX-PUE', 'puebla', 'Puebla', 'Pue.'),
    '22': ('MX-QUE', 'queretaro', 'Querétaro', 'Qro.'),
    '23': ('MX-ROO', 'quintana-roo', 'Quintana Roo', 'Q.R.'),
    '24': ('MX-SLP', 'san-luis-potosi', 'San Luis Potosí', 'SLP'),
    '25': ('MX-SIN', 'sinaloa', 'Sinaloa', 'Sin.'),
    '26': ('MX-SON', 'sonora', 'Sonora', 'Son.'),
    '27': ('MX-TAB', 'tabasco', 'Tabasco', 'Tab.'),
    '28': ('MX-TAM', 'tamaulipas', 'Tamaulipas', 'Tamps.'),
    '29': ('MX-TLA', 'tlaxcala', 'Tlaxcala', 'Tlax.'),
    '30': ('MX-VER', 'veracruz', 'Veracruz', 'Ver.'),
    '31': ('MX-YUC', 'yucatan', 'Yucatán', 'Yuc.'),
    '32': ('MX-ZAC', 'zacatecas', 'Zacatecas', 'Zac.'),
}

# Entidades pequeñas: requieren callout externo para que su label sea legible.
SMALL = {'MX-CMX', 'MX-TLA', 'MX-MOR', 'MX-COL', 'MX-AGU', 'MX-QUE'}

# Lienzo del mapa en unidades de viewBox (el componente usa estas mismas medidas).
CANVAS = {'width': 1000.0, 'height': 620.0, 'padding': 26.0}
LABEL_FONT = 13.0   # px (unidades de viewBox) del label de nombre
CHAR_W = 0.60       # ancho medio de carácter relativo al font-size


# --------------------------------------------------------------------------- #
# Descarga / caché
# --------------------------------------------------------------------------- #
def fetch(url, cached_dir=None, filename=None):
    if cached_dir:
        path = os.path.join(cached_dir, filename)
        if os.path.exists(path):
            print(f'  [cache] {path}')
            with open(path, 'r', encoding='utf-8') as fh:
                return json.load(fh)
    print(f'  [http ] {url}')
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = json.loads(resp.read())
    if cached_dir:
        os.makedirs(cached_dir, exist_ok=True)
        with open(os.path.join(cached_dir, filename), 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False)
    return data


# --------------------------------------------------------------------------- #
# Geometría: simplificación, centroides y anclaje de labels
# --------------------------------------------------------------------------- #
def round_ring(ring, ndigits):
    out = []
    for pt in ring:
        p = [round(float(pt[0]), ndigits), round(float(pt[1]), ndigits)]
        if not out or out[-1] != p:
            out.append(p)
    if len(out) > 1 and out[0] != out[-1]:
        out.append(list(out[0]))
    return out


def sq_dist(p, a, b):
    if a[0] == b[0] and a[1] == b[1]:
        return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2


def simplify(pts, tol2):
    """Douglas-Peucker iterativo (evita recursión profunda en anillos grandes)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        first, last = stack.pop()
        if last <= first + 1:
            continue
        max_d, idx = 0.0, -1
        for i in range(first + 1, last):
            d = sq_dist(pts[i], pts[first], pts[last])
            if d > max_d:
                max_d, idx = d, i
        if max_d > tol2:
            keep[idx] = True
            stack.append((first, idx))
            stack.append((idx, last))
    return [p for p, k in zip(pts, keep) if k]


def ring_area(ring):
    a = 0.0
    for i in range(len(ring) - 1):
        a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(a) / 2.0


def ring_centroid(ring):
    a, cx, cy = 0.0, 0.0, 0.0
    for i in range(len(ring) - 1):
        cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
        a += cross
        cx += (ring[i][0] + ring[i + 1][0]) * cross
        cy += (ring[i][1] + ring[i + 1][1]) * cross
    if a == 0:
        return list(ring[0])
    a /= 2.0
    return [cx / (6 * a), cy / (6 * a)]


def point_in_ring(pt, ring):
    x, y = pt
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def largest_ring(geometry):
    if geometry['type'] == 'Polygon':
        return geometry['coordinates'][0]
    return max((poly[0] for poly in geometry['coordinates']), key=ring_area)


def anchor_point(geometry):
    """Punto interior representativo: el centroide si cae dentro del polígono;
    si no (formas cóncavas como BCS o Sonora), aproximación del polo de
    inaccesibilidad maximizando la distancia al borde sobre una rejilla."""
    ring = largest_ring(geometry)
    c = ring_centroid(ring)
    if point_in_ring(c, ring):
        return c
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    best, best_d, steps = c, -1.0, 24
    for i in range(1, steps):
        for j in range(1, steps):
            x = min(xs) + (max(xs) - min(xs)) * i / steps
            y = min(ys) + (max(ys) - min(ys)) * j / steps
            if not point_in_ring([x, y], ring):
                continue
            d = min(sq_dist([x, y], ring[k], ring[k + 1]) for k in range(len(ring) - 1))
            if d > best_d:
                best_d, best = d, [x, y]
    return best


# --------------------------------------------------------------------------- #
# Proyección (idéntica a la del componente: Mercator + ajuste al lienzo)
# --------------------------------------------------------------------------- #
def mercator_xy(lon, lat):
    return math.radians(lon), math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def make_projection(features, canvas):
    pts = []
    for f in features:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for poly in polys:
            for ring in poly:
                for c in ring:
                    pts.append(mercator_xy(float(c[0]), float(c[1])))
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    w = canvas['width'] - 2 * canvas['padding']
    h = canvas['height'] - 2 * canvas['padding']
    scale = min(w / (maxx - minx), h / (maxy - miny))
    ox = canvas['padding'] + (w - (maxx - minx) * scale) / 2.0
    oy = canvas['padding'] + (h - (maxy - miny) * scale) / 2.0

    def project(lon, lat):
        x, y = mercator_xy(float(lon), float(lat))
        return [(x - minx) * scale + ox, (maxy - y) * scale + oy]

    return project


# --------------------------------------------------------------------------- #
# Layout de labels: cajas, colisiones y callouts
# --------------------------------------------------------------------------- #
DIRS = {
    'MX-CMX': (0.90, -0.45), 'MX-MOR': (-0.45, 0.90), 'MX-TLA': (0.75, -0.65),
    'MX-QUE': (-0.55, -0.85), 'MX-AGU': (-0.35, -0.95), 'MX-COL': (-1.0, 0.15),
    'MX-MEX': (-0.85, -0.50), 'MX-HID': (-0.90, -0.40), 'MX-PUE': (0.60, -0.80),
    'MX-GUA': (-0.75, -0.60), 'MX-SLP': (-0.80, -0.55), 'MX-VER': (0.80, 0.55),
}


def label_box(x, y, text, font, offset):
    w = max(len(text), 1) * font * CHAR_W
    h = font * 1.20
    cx, cy = x + offset[0], y + offset[1]
    return (cx - w / 2.0, cy - h / 2.0, cx + w / 2.0, cy + h / 2.0)


def boxes_overlap(a, b, pad=2.0):
    return not (a[2] + pad < b[0] or b[2] + pad < a[0] or a[3] + pad < b[1] or b[3] + pad < a[1])


def resolve_label_offsets(anchors, labels, areas, canvas, max_iter=240, step=5.0):
    """Separa los labels iterativamente. `anchors` y las cajas viven en unidades
    de viewBox, por lo que los offsets resultantes son independientes del tamaño
    con el que se renderice el mapa."""
    offsets = {rid: [0.0, 0.0] for rid in anchors}
    cx, cy = canvas['width'] / 2.0, canvas['height'] / 2.0
    for _ in range(max_iter):
        ids = list(anchors.keys())
        boxes = {rid: label_box(anchors[rid][0], anchors[rid][1], labels[rid], LABEL_FONT, offsets[rid]) for rid in ids}
        collisions = []
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                if boxes_overlap(boxes[a], boxes[b]):
                    collisions.append((a, b))
        if not collisions:
            return offsets, 0
        for a, b in collisions:
            # Se desplaza la región de menor área (menos espacio propio para su label).
            victim = a if areas[a] <= areas[b] else b
            d = DIRS.get(victim)
            if d is None:
                ax, ay = anchors[victim]
                dx, dy = ax - cx, ay - cy
                norm = math.hypot(dx, dy) or 1.0
                d = (dx / norm, dy / norm)
            offsets[victim][0] += d[0] * step
            offsets[victim][1] += d[1] * step
            offsets[victim][0] = max(-canvas['width'] / 2.0, min(canvas['width'] / 2.0, offsets[victim][0]))
            offsets[victim][1] = max(-canvas['height'] / 2.0, min(canvas['height'] / 2.0, offsets[victim][1]))
    ids = list(anchors.keys())
    boxes = {rid: label_box(anchors[rid][0], anchors[rid][1], labels[rid], LABEL_FONT, offsets[rid]) for rid in ids}
    left = sum(1 for i in range(len(ids)) for j in range(i + 1, len(ids))
               if boxes_overlap(boxes[ids[i]], boxes[ids[j]]))
    return offsets, left


# --------------------------------------------------------------------------- #
# Construcción
# --------------------------------------------------------------------------- #
MIN_AREA = 0.0008          # grados² (~10 km² a 20°N): descarta islotes irrelevantes
OUT_GEO = 'src/data/geo/mx/states.geo.json'
OUT_META = 'src/data/geo/mx/states.meta.json'


def build(cached_dir, tolerance, ndigits, root):
    print('1) Fuente oficial INEGI')
    cat = fetch(INEGI_CAT, cached_dir, 'inegi_mgee_cat.json')
    geo = fetch(INEGI_GEO, cached_dir, 'inegi_mgee.geojson')
    by_cve = {str(r['cve_ent']).zfill(2): r for r in cat['datos']}
    print(f'   catálogo AGEE : {len(by_cve)} entidades')
    print(f'   capa vectorial: totalReg={geo.get("totalReg")} features={len(geo.get("features", []))}')
    for k, v in (geo.get('metadatos') or {}).items():
        print(f'   metadato {k}: {v}')

    tol2 = tolerance ** 2
    feats, regions, anchors_ll = [], [], {}
    pts_before = pts_after = dropped = 0
    for feat in geo['features']:
        cve = str(feat['properties']['cve_ent']).zfill(2)
        iso, slug, short, abbr = REGIONS[cve]
        official = by_cve.get(cve, {}).get('nomgeo') or feat['properties'].get('nomgeo')
        g = feat['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        polys_out = []
        for poly in polys:
            pts_before += len(poly[0])
            ext = simplify(round_ring(poly[0], ndigits), tol2)
            if len(ext) < 4 or ring_area(ext) < MIN_AREA:
                dropped += 1
                continue
            pts_after += len(ext)
            rings = [ext]
            for hole in poly[1:]:
                pts_before += len(hole)
                h = simplify(round_ring(hole, ndigits), tol2)
                if len(h) >= 4 and ring_area(h) >= MIN_AREA / 8.0:
                    pts_after += len(h)
                    rings.append(h)
                else:
                    dropped += 1
            polys_out.append(rings)
        if not polys_out:
            raise SystemExit(f'geometría vacía para {iso}')
        geometry = ({'type': 'Polygon', 'coordinates': polys_out[0]} if len(polys_out) == 1
                    else {'type': 'MultiPolygon', 'coordinates': polys_out})
        anchor = anchor_point(geometry)
        anchors_ll[iso] = anchor
        feats.append({'type': 'Feature', 'id': iso,
                      'properties': {'regionId': iso, 'code': iso, 'name': official},
                      'geometry': geometry})
        regions.append({'regionId': iso, 'code': iso, 'inegiCode': cve, 'name': official,
                        'shortName': short, 'abbreviation': abbr, 'slug': slug,
                        'parentId': 'MX', 'type': 'state', 'level': 1,
                        'centroid': [round(anchor[0], 4), round(anchor[1], 4)],
                        'isSmall': iso in SMALL,
                        'labelText': abbr if iso in SMALL else short})

    print(f'\n2) Simplificación (tolerancia {tolerance}°, {ndigits} decimales)')
    print(f'   puntos: {pts_before} -> {pts_after} ({100.0 * (1 - pts_after / max(pts_before, 1)):.1f}% menos)')
    print(f'   anillos/islas descartados: {dropped}')

    project = make_projection(feats, CANVAS)
    anchors_px = {iso: project(*anchors_ll[iso]) for iso in anchors_ll}
    labels = {r['regionId']: r['shortName'].upper() for r in regions}
    areas = {}
    for f in feats:
        ring = largest_ring(f['geometry'])
        areas[f['id']] = ring_area([project(*c) for c in ring])

    offsets, left = resolve_label_offsets(anchors_px, labels, areas, CANVAS)
    print(f'\n3) Labels: colisiones sin resolver = {left}')
    callouts = []
    for r in regions:
        rid = r['regionId']
        dx, dy = offsets[rid]
        r['labelOffset'] = [int(round(dx)), int(round(dy))]
        need_callout = rid in SMALL or math.hypot(dx, dy) > 16
        r['labelCallout'] = bool(need_callout)
        if need_callout:
            callouts.append(f"{r['abbreviation']}({r['labelOffset'][0]},{r['labelOffset'][1]})")
    print('   callouts:', ' '.join(callouts) if callouts else '(ninguno)')

    print('\n4) Validaciones')
    ids = [f['id'] for f in feats]
    assert len(feats) == 32, f'se esperaban 32 entidades, hay {len(feats)}'
    assert len(set(ids)) == 32, 'regionId duplicados'
    assert len(regions) == 32, 'meta incompleta'
    expected = {v[0] for v in REGIONS.values()}
    assert set(ids) == expected, f'ids inesperados: {set(ids) ^ expected}'
    for r in regions:
        assert r['name'] == by_cve[r['inegiCode']]['nomgeo'], f"nombre no coincide en {r['regionId']}"
    print('   32 entidades · regionId únicos · nombres verificados contra el catálogo INEGI')

    cross = None
    if cached_dir:
        ref = os.path.join(cached_dir, 'mexicoHigh.json')
        if os.path.exists(ref):
            with open(ref, 'r', encoding='utf-8') as fh:
                alt = json.load(fh)['features']
            alt_anchor = {f['properties']['id']: anchor_point(f['geometry']) for f in alt}
            bad = []
            for r in regions:
                a = anchors_ll[r['regionId']]
                near = min(alt_anchor, key=lambda k: (alt_anchor[k][0] - a[0]) ** 2 +
                           (alt_anchor[k][1] - a[1]) ** 2)
                if near != r['regionId']:
                    bad.append((r['regionId'], near))
            cross = {'total': len(regions), 'mismatches': bad}
            print(f'   cruce con dataset independiente: {len(bad)} discrepancias'
                  f" {'(todas coinciden)' if not bad else bad}")
    return {'feats': feats, 'regions': regions, 'points_before': pts_before,
            'points_after': pts_after, 'dropped': dropped, 'collisions': left,
            'callouts': callouts, 'cross': cross}


def write_outputs(result, tolerance, ndigits, root):
    fc = {'type': 'FeatureCollection',
          'metadatos': {
              'fuente': 'INEGI. Marco Geoestadístico (Servicio Web del Catálogo Único de Claves Geoestadísticas)',
              'url_catalogo': INEGI_CAT,
              'url_vectorial': INEGI_GEO,
              'simplificacion_grados': tolerance,
              'decimales': ndigits,
              'entidades': 32,
              'generado_por': 'tools/geo/build-mx-states.py'},
          'features': result['feats']}
    meta = {'country': 'MX', 'level': 1, 'type': 'state', 'parentId': 'MX',
            'canvas': CANVAS, 'labelFont': LABEL_FONT,
            'source': {'name': 'INEGI · Marco Geoestadístico, diciembre de 2025',
                       'catalog': INEGI_CAT, 'vector': INEGI_GEO,
                       'note': ('cve_ent = Clave de Área Geoestadística Estatal oficial; '
                                'regionId = ISO 3166-2:MX; labelOffset en unidades de viewBox.')},
            'regions': result['regions']}
    os.makedirs(os.path.join(root, os.path.dirname(OUT_GEO)), exist_ok=True)
    geo_path = os.path.join(root, OUT_GEO)
    meta_path = os.path.join(root, OUT_META)
    with open(geo_path, 'w', encoding='utf-8') as fh:
        json.dump(fc, fh, ensure_ascii=False, separators=(',', ':'))
    with open(meta_path, 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    for path in (geo_path, meta_path):
        print(f'   escrito {os.path.relpath(path, root)}: {os.path.getsize(path) / 1024.0:.1f} KB')


def main():
    ap = argparse.ArgumentParser(description='Assets geográficos de México para GeoNetworkMap')
    ap.add_argument('--cached', default=None, help='directorio con copias locales de la fuente INEGI')
    ap.add_argument('--tolerance', type=float, default=0.005, help='tolerancia de simplificación (grados)')
    ap.add_argument('--ndigits', type=int, default=4, help='decimales de las coordenadas')
    ap.add_argument('--out', default=None, help='raíz de salida (default: raíz de ciudadan_frontend)')
    args = ap.parse_args()
    root = args.out or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    print(f'raíz de salida: {root}\n')
    result = build(args.cached, args.tolerance, args.ndigits, root)
    print('\n5) Escritura')
    write_outputs(result, args.tolerance, args.ndigits, root)
    print('\nListo. Regenerar tras cambiar de fuente: '
          'python3 tools/geo/build-mx-states.py')


if __name__ == '__main__':
    main()




