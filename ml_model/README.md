# Aang Air Quality ML API

API untuk prediksi kualitas udara menggunakan model **AdaBoost Classifier**.

## Model Info
- **Algorithm**: AdaBoost Classifier
- **Features**: temperature, CO2, PM2.5, humidity + derived features
- **Labels**:
  - 0: TCI Comfort & IAQI Good
  - 1: TCI Most Comfort & IAQI Unhealthy
  - 2: TCI Not Comfort & IAQI Good

## Deploy ke Google Cloud Run

### Prerequisites
1. Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
2. Login dan set project:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### Step 1: Build Container Image
```bash
cd ml_model
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/aang-ml-api
```

### Step 2: Deploy ke Cloud Run
```bash
gcloud run deploy aang-ml-api \
  --image gcr.io/YOUR_PROJECT_ID/aang-ml-api \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

### Step 3: Copy Service URL
Setelah deploy berhasil, akan muncul URL seperti:
```
https://aang-ml-api-xxxxxxxxxx-as.a.run.app
```

## Endpoints

### GET /
Info API
```bash
curl https://YOUR_SERVICE_URL/
```

### GET /health
Health check
```bash
curl https://YOUR_SERVICE_URL/health
```

### POST /predict
Prediksi kualitas udara
```bash
curl -X POST https://YOUR_SERVICE_URL/predict \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 26.5,
    "co2": 450,
    "pm25": 35,
    "humidity": 65
  }'
```

**Response:**
```json
{
  "prediction": 0,
  "label": "TCI Comfort & IAQI Good",
  "confidence": 0.85,
  "probabilities": {
    "TCI Comfort & IAQI Good": 0.85,
    "TCI Most Comfort & IAQI Unhealthy": 0.10,
    "TCI Not Comfort & IAQI Good": 0.05
  },
  "input": {
    "temperature": 26.5,
    "co2": 450,
    "pm25": 35,
    "humidity": 65
  }
}
```

## Update Frontend

Setelah deploy, update `web-dashboard/.env`:
```
VITE_ML_API_URL=https://aang-ml-api-xxxxxxxxxx-as.a.run.app
```

## Local Testing
```bash
cd ml_model
pip install -r requirements.txt
python api.py
# API berjalan di http://localhost:8080
```

## Files
- `api.py` - Flask API
- `adaboost_air_quality_classifier.pkl` - Trained model
- `Dockerfile` - Container config
- `requirements.txt` - Dependencies
- `.gcloudignore` - Files to ignore during build
