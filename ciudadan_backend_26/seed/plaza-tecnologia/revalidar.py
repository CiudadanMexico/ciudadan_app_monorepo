#!/usr/bin/env python3
"""Revalida precio/disponibilidad contra cyberpuerta antes de activar.
Uso: python3 revalidar.py  (lee catalogo-productos.json, sin escribir BD).
Reporta cambios de precio y agotados sin sustituir modelos.
Solo stdlib (urllib). Hasta 3 reintentos por SKU, secuencial y cortés."""
import json, re, time, urllib.request
from pathlib import Path

BASE = Path(__file__).resolve().parent
CAT = json.load(open(BASE / 'catalogo-productos.json', encoding='utf-8'))

HDR = {'User-Agent': 'CiudadanSeed/1.0 (revalidacion precios; contacto tienda oficial)'}

def buscar(sku):
    url = 'https://www.cyberpuerta.mx/search?q=' + urllib.parse.quote(sku) if False else None
    import urllib.parse
    url = 'https://www.cyberpuerta.mx/search?q=' + urllib.parse.quote(sku)
    for intento in range(3):
        try:
            req = urllib.request.Request(url, headers=HDR)
            html = urllib.request.urlopen(req, timeout=45).read().decode('utf-8', 'ignore')
            precios = re.findall(r'\$\s*([\d,]+\.\d{2})', html)
            pzas = re.findall(r'(\d+)\s*pzas?\.|Solo\s+(\d+)\s*pza', html)
            stock = None
            if pzas:
                nums = [int(a or b) for a, b in pzas]
                stock = nums[0] if nums else None
            agotado = 'Sin piezas disponibles' in html and stock is None
            return {'precio_obs': precios[0] if precios else None, 'stock_obs': stock, 'agotado': agotado}
        except Exception as e:  # noqa: BLE001 - reporte, no excepcion
            if intento == 2:
                return {'error': str(e)[:160]}
            time.sleep(2)
    return {'error': 'reintentos agotados'}

cambios, agotados, errores = [], [], []
for p in CAT['productos']:
    r = buscar(p['sku'])
    time.sleep(1)
    if 'error' in r:
        errores.append((p['sku'], r['error']))
        continue
    po = r.get('precio_obs')
    if po and abs(float(po.replace(',', '')) - float(p['costo_mxn'])) > 0.005:
        cambios.append((p['sku'], p['costo_mxn'], po, r.get('stock_obs')))
    if r.get('agotado') or r.get('stock_obs') == 0:
        agotados.append(p['sku'])
print(f'revisados: {len(CAT["productos"])} | cambios precio: {len(cambios)} | agotados: {len(agotados)} | errores: {len(errores)}')
for s, antes, ahora, st in cambios:
    print(f'CAMBIO {s}: costo {antes} -> observado {ahora} (stock {st})')
for s in agotados:
    print(f'AGOTADO {s}')
for s, e in errores:
    print(f'ERROR {s}: {e}')
