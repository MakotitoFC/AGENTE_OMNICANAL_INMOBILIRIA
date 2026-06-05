"""
Genera dataset sintético de 20,000 leads inmobiliarios.
Tasa de conversión objetivo: ~30% (inmobiliaria con buenas ventas).
Reglas: ciclo 2 meses, inactividad >14 días = perdido.
"""

import random
import csv
import os
from datetime import datetime, timedelta

random.seed(42)

# Configuración
N = 20000
TARGET_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(TARGET_DIR, exist_ok=True)
OUTPUT = os.path.join(TARGET_DIR, 'dataset_leads.csv')

# Tasas base de conversión por perfil (ajustadas para ~30% global)
TASAS_BASE = {
    'explorador': 0.08,   # 8%
    'referido':   0.40,   # 40%
    'inversor':   0.25,   # 25%
    'familiar':   0.22,   # 22%
}

PERFILES = [
    ('explorador', 0.30),
    ('referido',   0.20),
    ('inversor',   0.25),
    ('familiar',   0.25),
]

ORIGENES = {
    'explorador': [('web', 0.55), ('chat', 0.25), ('telegram', 0.10), ('manual', 0.10)],
    'referido':   [('referido', 1.0)],
    'inversor':   [('web', 0.35), ('chat', 0.25), ('referido', 0.25), ('telegram', 0.15)],
    'familiar':   [('web', 0.40), ('chat', 0.30), ('referido', 0.20), ('telegram', 0.10)],
}

ETAPAS = {
    'explorador': [('contactado', 0.50), ('calificado', 0.25), ('propuesta', 0.12),
                   ('negociacion', 0.08), ('cierre', 0.05)],
    'referido':   [('contactado', 0.20), ('calificado', 0.25), ('propuesta', 0.22),
                   ('negociacion', 0.18), ('cierre', 0.15)],
    'inversor':   [('contactado', 0.30), ('calificado', 0.28), ('propuesta', 0.18),
                   ('negociacion', 0.14), ('cierre', 0.10)],
    'familiar':   [('contactado', 0.28), ('calificado', 0.28), ('propuesta', 0.18),
                   ('negociacion', 0.14), ('cierre', 0.12)],
}

PROB_PERDIDO_BASE = {'explorador': 0.45, 'referido': 0.15, 'inversor': 0.25, 'familiar': 0.30}
FACTOR_PERDIDO_ETAPA = {'contactado': 1.0, 'calificado': 0.7, 'propuesta': 0.4,
                        'negociacion': 0.2, 'cierre': 0.05}

def elegir(distribucion):
    r = random.random()
    acum = 0.0
    for valor, prob in distribucion:
        acum += prob
        if r <= acum:
            return valor
    return distribucion[-1][0]

def generar_cliente(perfil, lead_id):
    etapa_activa = elegir(ETAPAS[perfil])
    origen = elegir(ORIGENES[perfil])

    prob_perdido = PROB_PERDIDO_BASE[perfil] * FACTOR_PERDIDO_ETAPA.get(etapa_activa, 0.5)
    esta_perdido = random.random() < prob_perdido
    if esta_perdido:
        etapa = 'perdido'
        dias_inactivo = random.randint(15, 60)
    else:
        etapa = etapa_activa
        if etapa == 'contactado': dias_inactivo = random.randint(0, 14)
        elif etapa == 'calificado': dias_inactivo = random.randint(0, 10)
        elif etapa in ['propuesta','negociacion']: dias_inactivo = random.randint(0, 7)
        else: dias_inactivo = random.randint(0, 3)

    prob_presupuesto = {'explorador':0.35, 'referido':0.80, 'inversor':0.85, 'familiar':0.75}
    tiene_presupuesto = random.random() < prob_presupuesto[perfil]

    precio_match = False
    if tiene_presupuesto:
        prob_match = {'explorador':0.40, 'referido':0.70, 'inversor':0.65, 'familiar':0.55}
        precio_match = random.random() < prob_match[perfil]

    prob_tipo = {'explorador':0.30, 'referido':0.75, 'inversor':0.85, 'familiar':0.70}
    tiene_tipo_preferido = random.random() < prob_tipo[perfil]

    prob_distrito = {'explorador':0.25, 'referido':0.70, 'inversor':0.60, 'familiar':0.80}
    tiene_distrito = random.random() < prob_distrito[perfil]

    base_seguim = {'contactado':(0,2), 'calificado':(1,3), 'propuesta':(2,4),
                   'negociacion':(3,5), 'cierre':(4,7), 'perdido':(0,2)}
    lo, hi = base_seguim.get(etapa, (0,3))
    num_seguimientos = random.randint(lo, hi)

    if random.random() < 0.60:
        score_base = 40
        if tiene_presupuesto: score_base += 10
        if precio_match: score_base += 10
        if tiene_tipo_preferido: score_base += 5
        if tiene_distrito: score_base += 5
        if origen == 'referido': score_base += 15
        puntuacion_lead = round(random.gauss(score_base, 12), 1)
        puntuacion_lead = max(10, min(95, puntuacion_lead))
    else:
        puntuacion_lead = 0

    problema_legal   = random.random() < 0.18
    problema_precio  = (not precio_match) and random.random() < 0.25
    problema_accesibilidad = random.random() < 0.15
    solo_explorando = random.random() < (0.35 if perfil=='explorador' else 0.08)

    p = TASAS_BASE[perfil]
    etapa_bono = {'contactado':0.00, 'calificado':0.04, 'propuesta':0.08,
                  'negociacion':0.14, 'cierre':0.22, 'perdido':-0.15}
    p += etapa_bono.get(etapa, 0)
    if tiene_presupuesto: p += 0.03
    if precio_match: p += 0.05
    if tiene_tipo_preferido: p += 0.02
    if tiene_distrito: p += 0.02
    if origen == 'referido': p += 0.05
    if num_seguimientos >= 4: p += 0.04
    elif num_seguimientos >= 2: p += 0.02
    if dias_inactivo <= 3: p += 0.04
    elif dias_inactivo <= 7: p += 0.02
    elif dias_inactivo > 14: p -= 0.10
    if problema_legal: p *= 0.55
    if problema_precio: p *= 0.70
    if problema_accesibilidad: p *= 0.80
    if solo_explorando: p *= 0.35
    p = max(0.0, min(0.65, p))

    # Umbral subido a 0.38 para reducir conversión a ~30%
    ruido = random.gauss(0, 0.05)
    convirtio = 1 if (p + ruido) > 0.38 else 0
    if etapa == 'perdido': convirtio = 0
    if etapa == 'cierre' and not problema_legal and random.random() < 0.65:
        convirtio = 1

    return {
        'lead_id': lead_id,
        'perfil': perfil,
        'origen': origen,
        'etapa': etapa,
        'tiene_presupuesto': int(tiene_presupuesto),
        'precio_match': int(precio_match),
        'tiene_tipo_preferido': int(tiene_tipo_preferido),
        'tiene_distrito': int(tiene_distrito),
        'dias_inactivo': dias_inactivo,
        'num_seguimientos': num_seguimientos,
        'puntuacion_lead': puntuacion_lead,
        'problema_legal': int(problema_legal),
        'problema_precio': int(problema_precio),
        'problema_accesibilidad': int(problema_accesibilidad),
        'solo_explorando': int(solo_explorando),
        'convirtio': convirtio,
        'probabilidad_calculada': round(p, 3),
        'fecha_creacion': (datetime.now() - timedelta(days=random.randint(0,90))).strftime('%Y-%m-%d')
    }

# Generación
clientes = []
acum = 0
for i, (perfil, pct) in enumerate(PERFILES):
    n = round(N * pct) if i < len(PERFILES)-1 else N - acum
    acum += n
    for _ in range(n):
        clientes.append(generar_cliente(perfil, len(clientes)+1))

random.shuffle(clientes)

# Guardar CSV
campos = ['lead_id','perfil','origen','etapa','tiene_presupuesto','precio_match',
          'tiene_tipo_preferido','tiene_distrito','dias_inactivo','num_seguimientos',
          'puntuacion_lead','problema_legal','problema_precio','problema_accesibilidad',
          'solo_explorando','convirtio','probabilidad_calculada','fecha_creacion']
with open(OUTPUT, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=campos)
    writer.writeheader()
    writer.writerows(clientes)

conv = sum(c['convirtio'] for c in clientes)
perdidos = sum(1 for c in clientes if c['etapa']=='perdido')
print(f"\n✅ Dataset generado: {OUTPUT}")
print(f"   Total: {len(clientes):,} leads")
print(f"   CONVERSIONES: {conv} ({conv/len(clientes)*100:.1f}%) ← objetivo ~30%")
print(f"   No conversiones: {len(clientes)-conv} ({(len(clientes)-conv)/len(clientes)*100:.1f}%)")
print(f"   Leads perdidos: {perdidos} ({perdidos/N*100:.1f}%)")