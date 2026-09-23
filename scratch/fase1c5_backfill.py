# scratch/fase1c5_backfill.py
#
# Script de Backfill Idempotente para Fase 1C.5 (Municipio, Atmosférico, Maquinaria, Presupuestos, Remitos)
#
# USO:
#   python scratch/fase1c5_backfill.py            -> MODO DRY-RUN (Solo lectura / Diagnóstico)
#   python scratch/fase1c5_backfill.py --execute  -> APLICA CAMBIOS REALES
#

import sqlite3
import json
import os
import sys
import uuid
import urllib.request

is_execute = '--execute' in sys.argv

candidate_paths = [
    os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'inventario-baupi', 'data.db'),
    os.path.join(os.path.expanduser('~'), 'AppData', 'Roaming', 'mi-app', 'data.db'),
]

sqlite_path = None
for p in candidate_paths:
    if os.path.exists(p):
        sqlite_path = p
        break

print("================================================================")
print(f"SCRIPT DE BACKFILL FASE 1C.5 -- MODO: {'EXECUTE REAL' if is_execute else 'DRY-RUN (SOLO LECTURA)'}")
print("================================================================\n")

if not sqlite_path:
    print("ERR: Base SQLite no encontrada en ninguna de las rutas esperadas.")
    sys.exit(1)

print(f"Base SQLite localizada en: {sqlite_path}")

# Leer env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
env_vars = {}
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")

supabase_url = os.environ.get('SUPABASE_URL') or env_vars.get('SUPABASE_URL')
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or env_vars.get('SUPABASE_SERVICE_ROLE_KEY') or env_vars.get('SUPABASE_KEY')

if not supabase_url or not service_key:
    print("ERR: Configuración Supabase no encontrada en .env")
    sys.exit(1)

def supabase_request(method, endpoint, payload=None):
    url = f"{supabase_url}/rest/v1/{endpoint}"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data = json.dumps(payload).encode('utf-8') if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            res_body = resp.read().decode('utf-8')
            return json.loads(res_body) if res_body else []
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return []
        raise e

conn = sqlite3.connect(sqlite_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

def get_sqlite_cols(table_name):
    try:
        cols = cur.execute(f"PRAGMA table_info('{table_name}')").fetchall()
        return set(c['name'] for c in cols)
    except Exception:
        return set()

def ensure_sqlite_columns():
    alter_specs = [
        ('municipio_ordenes', ['uuid']),
        ('municipio_pagos', ['uuid', 'orden_uuid']),
        ('municipio_orden_items', ['uuid', 'orden_uuid', 'producto_uuid']),
        ('atmos_ordenes', ['uuid']),
        ('atmos_pagos', ['uuid', 'orden_uuid']),
        ('maquinas', ['uuid']),
        ('trabajos_maquinas', ['uuid', 'maquina_uuid']),
        ('combustible_maquinas', ['uuid', 'maquina_uuid']),
        ('mantenimiento_maquinas', ['uuid', 'maquina_uuid']),
        ('presupuestos', ['uuid']),
        ('remitos', ['uuid'])
    ]

    for table, cols in alter_specs:
        existing = get_sqlite_cols(table)
        if not existing:
            continue
        for col in cols:
            if col not in existing:
                try:
                    cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT")
                except Exception as ex:
                    print(f"Aviso al agregar columna {col} a {table}: {ex}")

    conn.commit()

ensure_sqlite_columns()

# Las 11 entidades objetivo
TARGET_ENTITIES = [
    'municipio_ordenes',
    'municipio_pagos',
    'municipio_orden_items',
    'atmos_ordenes',
    'atmos_pagos',
    'maquinas',
    'trabajos_maquinas',
    'combustible_maquinas',
    'mantenimiento_maquinas',
    'presupuestos',
    'remitos'
]

stats_summary = {}

for entity in TARGET_ENTITIES:
    print(f"\n================================================================")
    print(f"DIAGNÓSTICO Y AUDITORÍA DE FASE 1C.5 — ENTIDAD: {entity.upper()}")
    print(f"================================================================")

    cols = get_sqlite_cols(entity)
    if not cols:
        print(f"  Tabla {entity} no existe en SQLite local. Omitiendo...")
        continue

    sql_rows = cur.execute(f"SELECT * FROM {entity}").fetchall()
    sb_rows = supabase_request("GET", f"{entity}?select=*")

    sql_by_id = {r['id']: dict(r) for r in sql_rows if 'id' in cols and r['id'] is not None}
    sb_by_id = {r['id']: r for r in sb_rows if 'id' in r and r['id'] is not None}

    all_ids = sorted(list(set(sql_by_id.keys()) | set(sb_by_id.keys())))

    case1 = [] # SQLite solo
    case2 = [] # Supabase solo
    case3 = [] # Ambos por ID, ambos sin UUID -> Generar 1 UUID idéntico
    case4 = [] # Ambos por ID, SQLite tiene UUID, Supabase no
    case5 = [] # Ambos por ID, Supabase tiene UUID, SQLite no
    ok_count = 0

    plan_updates_sql = {} # id -> patch_dict
    plan_updates_sb = {}  # id -> patch_dict

    for rid in all_ids:
        s_row = sql_by_id.get(rid)
        r_row = sb_by_id.get(rid)

        if s_row and not r_row:
            case1.append(rid)
            s_uuid = s_row.get('uuid') or str(uuid.uuid4())
            plan_updates_sql[rid] = {'uuid': s_uuid}
        elif r_row and not s_row:
            case2.append(rid)
            r_uuid = r_row.get('uuid') or str(uuid.uuid4())
            plan_updates_sb[rid] = {'uuid': r_uuid}
        else:
            s_uuid = s_row.get('uuid')
            r_uuid = r_row.get('uuid')

            if not s_uuid and not r_uuid:
                case3.append(rid)
                shared_uuid = str(uuid.uuid4())
                plan_updates_sql[rid] = {'uuid': shared_uuid}
                plan_updates_sb[rid] = {'uuid': shared_uuid}
            elif s_uuid and not r_uuid:
                case4.append(rid)
                plan_updates_sb[rid] = {'uuid': s_uuid}
            elif r_uuid and not s_uuid:
                case5.append(rid)
                plan_updates_sql[rid] = {'uuid': r_uuid}
            else:
                if s_uuid == r_uuid:
                    ok_count += 1
                else:
                    print(f"\n  🚨 ERROR CRÍTICO — DESCALCE DE UUID DETECTADO EN ENTIDAD '{entity.upper()}'!")
                    print(f"  ID: {rid}")
                    print(f"  SQLite UUID:   {s_uuid}")
                    print(f"  Supabase UUID: {r_uuid}")
                    print("  ABORTANDO BACKFILL INMEDIATAMENTE. Se requiere investigación manual.")
                    sys.exit(1)

    print(f"  Total registros SQLite: {len(sql_rows)}")
    print(f"  Total registros Supabase: {len(sb_rows)}")
    print(f"  UUIDs ya sincronizados (OK): {ok_count}")
    print(f"  [Caso 1] Fila solo en SQLite: {len(case1)} -> {case1}")
    print(f"  [Caso 2] Fila solo en Supabase: {len(case2)} -> {case2}")
    print(f"  [Caso 3] Ambos en ID, ambos SIN UUID: {len(case3)} -> {case3}")
    print(f"  [Caso 4] Ambos en ID, SQLite TIENE UUID, Supabase NO: {len(case4)} -> {case4}")
    print(f"  [Caso 5] Ambos en ID, Supabase TIENE UUID, SQLite NO: {len(case5)} -> {case5}")
    print(f"  Pendientes actualización -> SQLite: {len(plan_updates_sql)} | Supabase: {len(plan_updates_sb)}")

    stats_summary[entity] = {
        'total_sql': len(sql_rows),
        'total_sb': len(sb_rows),
        'ok': ok_count,
        'case1': len(case1),
        'case2': len(case2),
        'case3': len(case3),
        'case4': len(case4),
        'case5': len(case5),
        'updates_sql': plan_updates_sql,
        'updates_sb': plan_updates_sb
    }

# 2. RESOLUCIÓN DE FORÁNEAS (FK UUIDs)
print(f"\n================================================================")
print("DIAGNÓSTICO DE CLAVES FORÁNEAS UUID (orden_uuid, maquina_uuid, producto_uuid)")
print("================================================================")

# Cargar mapeos actualizados
def build_id_to_uuid_map(entity):
    res = {}
    if entity in stats_summary:
        cols = get_sqlite_cols(entity)
        if 'uuid' in cols:
            sql_rows = cur.execute(f"SELECT id, uuid FROM {entity}").fetchall()
            for r in sql_rows:
                if r['id'] and r['uuid']:
                    res[r['id']] = r['uuid']
        # Incluir actualizaciones planificadas
        for rid, patch in stats_summary[entity]['updates_sql'].items():
            if 'uuid' in patch:
                res[rid] = patch['uuid']
        for rid, patch in stats_summary[entity]['updates_sb'].items():
            if 'uuid' in patch:
                res[rid] = patch['uuid']
    return res

muni_ord_map = build_id_to_uuid_map('municipio_ordenes')
atmos_ord_map = build_id_to_uuid_map('atmos_ordenes')
maquina_map = build_id_to_uuid_map('maquinas')

# Mapeo de productos
prod_map = {}
prod_sql = cur.execute("SELECT id, uuid FROM productos WHERE uuid IS NOT NULL").fetchall()
for p in prod_sql:
    prod_map[p['id']] = p['uuid']

# FK municipio_pagos -> orden_uuid
fk_muni_pagos_sql = {}
fk_muni_pagos_sb = {}
if 'municipio_pagos' in stats_summary:
    for r in cur.execute("SELECT id, orden_id, orden_uuid FROM municipio_pagos").fetchall():
        if r['orden_id'] and not r['orden_uuid'] and r['orden_id'] in muni_ord_map:
            fk_muni_pagos_sql[r['id']] = muni_ord_map[r['orden_id']]

    sb_p = supabase_request("GET", "municipio_pagos?select=id,orden_id,orden_uuid")
    for r in sb_p:
        if r.get('orden_id') and not r.get('orden_uuid') and r['orden_id'] in muni_ord_map:
            fk_muni_pagos_sb[r['id']] = muni_ord_map[r['orden_id']]

print(f"  [municipio_pagos] FK orden_uuid pendientes -> SQLite: {len(fk_muni_pagos_sql)} | Supabase: {len(fk_muni_pagos_sb)}")

# FK atmos_pagos -> orden_uuid
fk_atmos_pagos_sql = {}
fk_atmos_pagos_sb = {}
if 'atmos_pagos' in stats_summary:
    for r in cur.execute("SELECT id, orden_id, orden_uuid FROM atmos_pagos").fetchall():
        if r['orden_id'] and not r['orden_uuid'] and r['orden_id'] in atmos_ord_map:
            fk_atmos_pagos_sql[r['id']] = atmos_ord_map[r['orden_id']]

    sb_p = supabase_request("GET", "atmos_pagos?select=id,orden_id,orden_uuid")
    for r in sb_p:
        if r.get('orden_id') and not r.get('orden_uuid') and r['orden_id'] in atmos_ord_map:
            fk_atmos_pagos_sb[r['id']] = atmos_ord_map[r['orden_id']]

print(f"  [atmos_pagos] FK orden_uuid pendientes -> SQLite: {len(fk_atmos_pagos_sql)} | Supabase: {len(fk_atmos_pagos_sb)}")

# FK subentidades maquinas -> maquina_uuid
sub_maquinas = ['trabajos_maquinas', 'combustible_maquinas', 'mantenimiento_maquinas']
fk_maquinas_sql = {sub: {} for sub in sub_maquinas}
fk_maquinas_sb = {sub: {} for sub in sub_maquinas}

for sub in sub_maquinas:
    if sub in stats_summary:
        cols = get_sqlite_cols(sub)
        if 'maquina_uuid' in cols:
            for r in cur.execute(f"SELECT id, maquina_id, maquina_uuid FROM {sub}").fetchall():
                if r['maquina_id'] and not r['maquina_uuid'] and r['maquina_id'] in maquina_map:
                    fk_maquinas_sql[sub][r['id']] = maquina_map[r['maquina_id']]

        sb_sub = supabase_request("GET", f"{sub}?select=id,maquina_id,maquina_uuid")
        for r in sb_sub:
            if r.get('maquina_id') and not r.get('maquina_uuid') and r['maquina_id'] in maquina_map:
                fk_maquinas_sb[sub][r['id']] = maquina_map[r['maquina_id']]

        print(f"  [{sub}] FK maquina_uuid pendientes -> SQLite: {len(fk_maquinas_sql[sub])} | Supabase: {len(fk_maquinas_sb[sub])}")

if not is_execute:
    print("\n================================================================")
    print("RESULTADO MODO DRY-RUN: Auditoría y plan de backfill listos.")
    print("   Ningún dato de producción ha sido modificado.")
    print("   Para aplicar los cambios ejecutá:")
    print("   python scratch/fase1c5_backfill.py --execute")
    print("================================================================")
    conn.close()
    sys.exit(0)

# 3. EJECUCIÓN REAL DE CAMBIOS (--execute)
print("\n================================================================")
print("EJECUTANDO BACKFILL REAL EN SQLITE Y SUPABASE CLOUD...")
print("================================================================")

for entity in TARGET_ENTITIES:
    if entity not in stats_summary:
        continue

    info = stats_summary[entity]
    updates_sql = info['updates_sql']
    updates_sb = info['updates_sb']

    print(f"\n--- Aplicando cambios a: {entity.upper()} ---")

    cols = get_sqlite_cols(entity)

    # A. Actualizar SQLite
    for rid, patch in updates_sql.items():
        set_clauses = [f"{k} = ?" for k in patch.keys()]
        values = list(patch.values()) + [rid]
        cur.execute(f"UPDATE {entity} SET {', '.join(set_clauses)} WHERE id = ?", values)
        print(f"  [SQLite] {entity} ID {rid} actualizado con: {patch}")

    # B. Actualizar Supabase
    for rid, patch in updates_sb.items():
        supabase_request("PATCH", f"{entity}?id=eq.{rid}", patch)
        print(f"  [Supabase] {entity} ID {rid} actualizado con: {patch}")

# C. Aplicar FK UUIDs en SQLite & Supabase
print("\n--- Aplicando FK UUIDs ---")

for rid, ord_uuid in fk_muni_pagos_sql.items():
    cur.execute("UPDATE municipio_pagos SET orden_uuid = ? WHERE id = ?", (ord_uuid, rid))
print(f"  [SQLite] municipio_pagos orden_uuid actualizados: {len(fk_muni_pagos_sql)}")

for rid, ord_uuid in fk_muni_pagos_sb.items():
    supabase_request("PATCH", f"municipio_pagos?id=eq.{rid}", {"orden_uuid": ord_uuid})
print(f"  [Supabase] municipio_pagos orden_uuid actualizados: {len(fk_muni_pagos_sb)}")

for rid, ord_uuid in fk_atmos_pagos_sql.items():
    cur.execute("UPDATE atmos_pagos SET orden_uuid = ? WHERE id = ?", (ord_uuid, rid))
print(f"  [SQLite] atmos_pagos orden_uuid actualizados: {len(fk_atmos_pagos_sql)}")

for rid, ord_uuid in fk_atmos_pagos_sb.items():
    supabase_request("PATCH", f"atmos_pagos?id=eq.{rid}", {"orden_uuid": ord_uuid})
print(f"  [Supabase] atmos_pagos orden_uuid actualizados: {len(fk_atmos_pagos_sb)}")

for sub in sub_maquinas:
    for rid, maq_uuid in fk_maquinas_sql[sub].items():
        cur.execute(f"UPDATE {sub} SET maquina_uuid = ? WHERE id = ?", (maq_uuid, rid))
    print(f"  [SQLite] {sub} maquina_uuid actualizados: {len(fk_maquinas_sql[sub])}")

    for rid, maq_uuid in fk_maquinas_sb[sub].items():
        supabase_request("PATCH", f"{sub}?id=eq.{rid}", {"maquina_uuid": maq_uuid})
    print(f"  [Supabase] {sub} maquina_uuid actualizados: {len(fk_maquinas_sb[sub])}")

conn.commit()
conn.close()

print("\n================================================================")
print("BACKFILL FASE 1C.5 EJECUTADO EXITOSAMENTE Y COMITIDO EN SQLITE/SUPABASE.")
print("================================================================")
