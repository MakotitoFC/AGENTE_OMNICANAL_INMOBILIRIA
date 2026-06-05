"""
Microservicio de predicción de leads — FastAPI.
Carga el modelo GradientBoosting entrenado y expone /predecir.

El modelo NO clasifica sí/no: devuelve la PROBABILIDAD de conversión
para que el frontend ordene los leads por prioridad.

Ejecutar:
    cd backend/ml-service
    pip install -r requirements.txt
    python main.py          (o: uvicorn main:app --port 8000)

Endpoints:
    GET  /salud          → estado del servicio y métricas del modelo
    POST /predecir       → recibe lista de leads, devuelve probabilidades + ranking
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

# ─── Rutas a los artefactos del modelo ────────────────────────────────────────
DATA_DIR    = os.path.join(os.path.dirname(__file__), '..', 'data')
MODEL_PATH  = os.path.join(DATA_DIR, 'modelo_leads.pkl')
SCALER_PATH = os.path.join(DATA_DIR, 'scaler.pkl')
FEAT_PATH   = os.path.join(DATA_DIR, 'features_leads.pkl')
UMBRAL_PATH = os.path.join(DATA_DIR, 'umbral_optimo.pkl')
METR_PATH   = os.path.join(DATA_DIR, 'metricas_leads.json')

# ─── Cargar modelo al iniciar ─────────────────────────────────────────────────
modelo   = joblib.load(MODEL_PATH)
scaler   = joblib.load(SCALER_PATH)
FEATURES = joblib.load(FEAT_PATH)
UMBRAL   = float(joblib.load(UMBRAL_PATH))

with open(METR_PATH, encoding='utf-8') as f:
    METRICAS = json.load(f)

print(f"[OK] Modelo cargado - {len(FEATURES)} features, umbral={UMBRAL:.3f}, ROC-AUC={METRICAS.get('roc_auc')}")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Luz del Sol — ML Leads", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# ─── Schema de entrada ────────────────────────────────────────────────────────
class Lead(BaseModel):
    id: int
    etapa: str = "contactado"
    origen: str = "web"
    tiene_presupuesto: int = 0
    precio_match: int = 0
    tiene_tipo_preferido: int = 0
    tiene_distrito: int = 0
    dias_inactivo: int = 0
    num_seguimientos: int = 0
    puntuacion_lead: float = 0
    # Bloqueadores (si el CRM los captura; por defecto 0)
    problema_legal: int = 0
    problema_precio: int = 0
    problema_accesibilidad: int = 0
    solo_explorando: int = 0

class PrediccionRequest(BaseModel):
    leads: List[Lead]


# ─── Feature engineering — IDÉNTICO a entrenar_modelo.py ──────────────────────
def construir_features(df: pd.DataFrame) -> pd.DataFrame:
    # Blindaje: coercionar numéricos y acotar dias_inactivo al rango de los bins
    # (evita NaN en pd.cut → 'Cannot convert float NaN to integer')
    df['dias_inactivo']    = pd.to_numeric(df['dias_inactivo'],    errors='coerce').fillna(999).clip(lower=0, upper=9998)
    df['num_seguimientos'] = pd.to_numeric(df['num_seguimientos'], errors='coerce').fillna(0).clip(lower=0)
    df['puntuacion_lead']  = pd.to_numeric(df['puntuacion_lead'],  errors='coerce').fillna(0).clip(lower=0, upper=100)
    for col in ['tiene_presupuesto','precio_match','tiene_tipo_preferido','tiene_distrito',
                'problema_legal','problema_precio','problema_accesibilidad','solo_explorando']:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).clip(lower=0, upper=1).astype(int)

    etapa_orden = {'perdido':0,'contactado':1,'calificado':2,'propuesta':3,'negociacion':4,'cierre':5}
    df['etapa_num'] = df['etapa'].map(etapa_orden).fillna(0)

    origen_val = {'referido':4,'chat':3,'telegram':3,'web':2,'manual':1}
    df['origen_num'] = df['origen'].map(origen_val).fillna(2)

    df['esta_perdido'] = ((df['dias_inactivo'] > 14) | (df['etapa'] == 'perdido')).astype(int)
    df['seguimientos_por_semana'] = (df['num_seguimientos'] / ((df['dias_inactivo']+1)/7)).clip(upper=10)
    df['actividad_nivel'] = pd.cut(df['dias_inactivo'], bins=[-1,3,7,14,9999], labels=[4,3,2,1]).astype(int)

    bloqueadores = ['problema_legal','problema_precio','problema_accesibilidad','solo_explorando']
    df['score_bloqueadores'] = df[bloqueadores].sum(axis=1)
    df['lead_caliente'] = ((df['num_seguimientos']>=3) & (df['puntuacion_lead']>=60) & (df['dias_inactivo']<7)).astype(int)
    df['lead_frio']     = ((df['score_bloqueadores']>=2) | (df['dias_inactivo']>14) | (df['num_seguimientos']==0)).astype(int)

    return df


def nivel_prioridad(prob: float) -> str:
    """Convierte probabilidad en banda de prioridad para el asesor."""
    if prob >= 0.70: return 'muy_alta'
    if prob >= 0.45: return 'alta'
    if prob >= 0.25: return 'media'
    return 'baja'


# ─── Endpoints ────────────────────────────────────────────────────────────────
@app.get("/salud")
def salud():
    return {
        "estado": "ok",
        "modelo": "GradientBoostingClassifier",
        "features": len(FEATURES),
        "umbral_referencia": round(UMBRAL, 4),
        "roc_auc": METRICAS.get("roc_auc"),
        "recall": METRICAS.get("recall"),
        "precision": METRICAS.get("precision"),
        "version": METRICAS.get("version"),
    }


@app.post("/predecir")
def predecir(req: PrediccionRequest):
    if not req.leads:
        return {"success": True, "ranking": []}

    # DataFrame con los datos crudos
    df = pd.DataFrame([l.model_dump() for l in req.leads])
    ids = df['id'].tolist()

    # Construir las 18 features y escalar
    df = construir_features(df)
    X = df[FEATURES]
    X_scaled = scaler.transform(X)

    # Probabilidad de conversión (clase 1)
    probas = modelo.predict_proba(X_scaled)[:, 1]

    # Armar ranking ordenado por probabilidad descendente
    resultado = []
    for i, lead_id in enumerate(ids):
        p = float(probas[i])
        resultado.append({
            "id": int(lead_id),
            "probabilidad": round(p, 4),
            "probabilidad_pct": round(p * 100, 1),
            "prioridad": nivel_prioridad(p),
            "supera_umbral": bool(p >= UMBRAL),
        })

    resultado.sort(key=lambda r: r["probabilidad"], reverse=True)

    # Asignar posición de ranking
    for pos, r in enumerate(resultado, start=1):
        r["ranking"] = pos

    return {
        "success": True,
        "umbral": round(UMBRAL, 4),
        "total": len(resultado),
        "ranking": resultado,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
