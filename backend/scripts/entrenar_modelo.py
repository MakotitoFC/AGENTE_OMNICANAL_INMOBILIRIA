"""
Entrenamiento de modelo con selección de umbral que minimiza (FP + FN).
Permite ponderar costos. Convierte tipos numpy a int para JSON.
"""

import json, os, joblib, numpy as np, pandas as pd, matplotlib.pyplot as plt
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (confusion_matrix, roc_auc_score, accuracy_score,
                             precision_score, recall_score, f1_score, roc_curve)
from sklearn.preprocessing import StandardScaler

try:
    from imblearn.over_sampling import SMOTE
    SMOTE_AVAILABLE = True
except ImportError:
    SMOTE_AVAILABLE = False
    print("⚠️  Para mejor balance: pip install imbalanced-learn")

np.random.seed(42)

# ========= CONFIGURACIÓN DE COSTOS ==========
# FN (perder un comprador) cuesta 3x más que FP (seguimiento innecesario).
# El umbral se ajusta para minimizar compradores perdidos.
COSTO_FN = 3   # perder un comprador real
COSTO_FP = 1   # seguimiento innecesario

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
CSV_PATH = os.path.join(BASE_DIR, 'dataset_leads.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'modelo_leads.pkl')
FEAT_PATH = os.path.join(BASE_DIR, 'features_leads.pkl')
METR_PATH = os.path.join(BASE_DIR, 'metricas_leads.json')
UMBRAL_PATH = os.path.join(BASE_DIR, 'umbral_optimo.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')
PLOT_PATH = os.path.join(BASE_DIR, 'curva_roc.png')

print("="*70)
print("ENTRENAMIENTO MODELO LEADS - Minimización de errores (FP+FN)")
print(f"Costos: FN = {COSTO_FN}, FP = {COSTO_FP}")
print("="*70)

df = pd.read_csv(CSV_PATH)
print(f"📊 Datos: {len(df):,} registros, conversión {df['convirtio'].mean()*100:.1f}%")

# Feature engineering
etapa_orden = {'perdido':0,'contactado':1,'calificado':2,'propuesta':3,'negociacion':4,'cierre':5}
df['etapa_num'] = df['etapa'].map(etapa_orden).fillna(0)
origen_val = {'referido':4,'chat':3,'telegram':3,'web':2,'manual':1}
df['origen_num'] = df['origen'].map(origen_val).fillna(2)
df['esta_perdido'] = ((df['dias_inactivo']>14) | (df['etapa']=='perdido')).astype(int)
df['seguimientos_por_semana'] = (df['num_seguimientos'] / ((df['dias_inactivo']+1)/7)).clip(upper=10)
df['actividad_nivel'] = pd.cut(df['dias_inactivo'], bins=[-1,3,7,14,9999], labels=[4,3,2,1]).astype(int)
bloqueadores = ['problema_legal','problema_precio','problema_accesibilidad','solo_explorando']
df['score_bloqueadores'] = df[bloqueadores].sum(axis=1)
df['lead_caliente'] = ((df['num_seguimientos']>=3) & (df['puntuacion_lead']>=60) & (df['dias_inactivo']<7)).astype(int)
df['lead_frio'] = ((df['score_bloqueadores']>=2) | (df['dias_inactivo']>14) | (df['num_seguimientos']==0)).astype(int)

FEATURES = ['etapa_num','origen_num','tiene_presupuesto','precio_match',
            'tiene_tipo_preferido','tiene_distrito','actividad_nivel','num_seguimientos',
            'puntuacion_lead','problema_legal','problema_precio','problema_accesibilidad',
            'solo_explorando','esta_perdido','seguimientos_por_semana','score_bloqueadores',
            'lead_caliente','lead_frio']
X = df[FEATURES]
y = df['convirtio']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"Train: {len(X_train):,} (conv {y_train.mean()*100:.1f}%) | Test: {len(X_test):,} (conv {y_test.mean()*100:.1f}%)")

if SMOTE_AVAILABLE and y_train.mean() < 0.30:
    print("\n⚖️ Aplicando SMOTE...")
    smote = SMOTE(random_state=42, k_neighbors=min(5, y_train.sum()))
    X_train, y_train = smote.fit_resample(X_train, y_train)
    print(f"   Post-SMOTE: {len(X_train):,} (conv {y_train.mean()*100:.1f}%)")

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = GradientBoostingClassifier(n_estimators=150, learning_rate=0.08, max_depth=3,
                                   subsample=0.85, random_state=42)
model.fit(X_train_scaled, y_train)
print("✅ Modelo entrenado")

y_proba = model.predict_proba(X_test_scaled)[:, 1]
fpr, tpr, thresholds = roc_curve(y_test, y_proba)

best_cost = float('inf')
best_th = 0.5
for th in thresholds:
    y_pred_temp = (y_proba >= th).astype(int)
    cm_temp = confusion_matrix(y_test, y_pred_temp)
    if cm_temp.shape == (2,2):
        tn, fp, fn, tp = cm_temp.ravel()
        cost = COSTO_FN * fn + COSTO_FP * fp
        if cost < best_cost:
            best_cost = cost
            best_th = th

y_pred_best = (y_proba >= best_th).astype(int)
tn, fp, fn, tp = confusion_matrix(y_test, y_pred_best).ravel()
total_errores = int(fn + fp)  # convertir a int nativo
tasa_error = total_errores / len(y_test)

print(f"\n🎯 Umbral que minimiza costo ponderado: {best_th:.4f}")
print(f"   Costo total en test: {best_cost:.2f}")
print(f"   Errores totales (FN+FP): {total_errores} sobre {len(y_test):,} ({tasa_error*100:.2f}%)")

roc_auc = roc_auc_score(y_test, y_proba)
acc = accuracy_score(y_test, y_pred_best)
prec = precision_score(y_test, y_pred_best)
rec = recall_score(y_test, y_pred_best)
f1 = f1_score(y_test, y_pred_best)

print("\n" + "="*70)
print("📈 RESULTADOS CON UMBRAL DE MÍNIMO ERROR (FP+FN)")
print("="*70)
print(f"   ROC-AUC:    {roc_auc:.4f}")
print(f"   Accuracy:   {acc*100:.1f}%")
print(f"   Precision:  {prec:.3f}")
print(f"   Recall:     {rec:.3f}")
print(f"   F1-Score:   {f1:.3f}")

print(f"\n📊 Matriz de confusión (umbral {best_th:.3f}):")
print(f"               Pred: No  Pred: Sí")
print(f"  Real: No compró   {tn:4d}      {fp:4d}")
print(f"  Real: Compró      {fn:4d}      {tp:4d}")
print(f"\n📈 Interpretación:")
print(f"   ✅ VP: {tp} compradores acertados")
print(f"   ❌ FN: {fn} compradores perdidos ({fn/(tp+fn)*100:.1f}%)")
print(f"   ✓ VN: {tn} no-compradores bien clasificados")
print(f"   ⚠️  FP: {fp} seguimientos innecesarios ({fp/(tn+fp)*100:.1f}%)")
print(f"   📉 Error total: {total_errores} ({tasa_error*100:.2f}%)")

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=cv, scoring='roc_auc')
print(f"\n🔹 Validación cruzada ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

importancias = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
print("\n🔝 Top 10 variables:")
for f, imp in importancias[:10]:
    print(f"   {f:25} {imp:.4f}")

# Curva ROC
plt.figure(figsize=(8,6))
plt.plot(fpr, tpr, label=f'ROC-AUC = {roc_auc:.3f}')
plt.plot([0,1], [0,1], 'r--')
idx = np.argmin(np.abs(thresholds - best_th))
plt.scatter(fpr[idx], tpr[idx], c='g', s=100, label=f'Umbral min error = {best_th:.2f}')
plt.xlabel('FPR'); plt.ylabel('TPR'); plt.title('Curva ROC - Minimización de errores')
plt.legend(); plt.grid(True); plt.savefig(PLOT_PATH, dpi=150, bbox_inches='tight'); plt.close()
print(f"\n📈 Curva ROC guardada: {PLOT_PATH}")

# Guardar artefactos
joblib.dump(model, MODEL_PATH)
joblib.dump(FEATURES, FEAT_PATH)
joblib.dump(best_th, UMBRAL_PATH)
joblib.dump(scaler, SCALER_PATH)

# Convertir a tipos nativos de Python para JSON
metricas = {
    'roc_auc': float(round(roc_auc, 4)),
    'umbral_usado': float(round(best_th, 4)),
    'accuracy': float(round(acc, 4)),
    'precision': float(round(prec, 4)),
    'recall': float(round(rec, 4)),
    'f1': float(round(f1, 4)),
    'error_total': int(total_errores),
    'tasa_error': float(round(tasa_error, 4)),
    'fp': int(fp),
    'fn': int(fn),
    'cv_roc_auc_mean': float(round(cv_scores.mean(), 4)),
    'cv_roc_auc_std': float(round(cv_scores.std(), 4)),
    'matriz_confusion': {
        'TN': int(tn),
        'FP': int(fp),
        'FN': int(fn),
        'TP': int(tp)
    },
    'features': FEATURES,
    'importancias': {f: float(round(imp, 4)) for f, imp in importancias},
    'costo_fn': COSTO_FN,
    'costo_fp': COSTO_FP,
    'version': '20k_min_error_total'
}

with open(METR_PATH, 'w', encoding='utf-8') as f:
    json.dump(metricas, f, indent=2, ensure_ascii=False)

print(f"\n💾 Modelo guardado con umbral {best_th:.4f}")
print(f"   Archivos: {MODEL_PATH}, {UMBRAL_PATH}")
print("="*70)