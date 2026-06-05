# Microservicio ML — Predicción de Leads

Sirve el modelo GradientBoosting entrenado. Devuelve la **probabilidad** de
conversión de cada lead para que el sistema los **ordene por prioridad**
(no clasifica sí/no — nunca descarta un lead).

## Requisitos previos

El modelo debe estar entrenado. Si no existe `../data/modelo_leads.pkl`:

```bash
cd ../scripts
python generar_dataset.py
python entrenar_modelo.py
```

## Instalar y ejecutar

```bash
cd backend/ml-service
pip install -r requirements.txt
python main.py
```

El servicio queda en `http://localhost:8000`.

## Endpoints

- `GET  /salud`     → estado y métricas del modelo
- `POST /predecir`  → recibe `{ leads: [...] }`, devuelve ranking por probabilidad

## Arquitectura

```
Frontend (/analisis)
    ↓  GET /api/analisis-leads
Backend Node (puerto 3001)
    ↓  arma features desde el CRM (Supabase)
    ↓  POST /predecir
ML Service Python (puerto 8000)  ←── modelo_leads.pkl
    ↓  probabilidades
Backend Node → Frontend (lista ordenada)
```

## Nota sobre bloqueadores

El modelo usa 4 bloqueadores (`problema_legal`, `problema_precio`,
`problema_accesibilidad`, `solo_explorando`). En producción el CRM debe
capturarlos en `clientes.preferencias_extra`. Si no se capturan, se asume 0
y el scoring será menos preciso para esos leads.

## Variable de entorno (opcional)

En el backend Node, define `ML_SERVICE_URL` si el servicio no está en localhost:8000.
