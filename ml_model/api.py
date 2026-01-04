# Air Quality Prediction API
# Flask API untuk serve model AdaBoost ML dengan StandardScaler
# Deploy ke Google Cloud Run

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ================= LOAD MODEL BUNDLE =================
# Bundle berisi: model, scaler, label_encoder
BUNDLE_PATH = os.path.join(os.path.dirname(__file__), 'adaboost_air_quality_bundle.pkl')

bundle = None
model = None
scaler = None
label_classes = []

def load_model_bundle():
    global bundle, model, scaler, label_classes
    try:
        with open(BUNDLE_PATH, 'rb') as f:
            bundle = pickle.load(f)
        
        model = bundle['model']
        scaler = bundle['scaler']
        label_classes = bundle['classes']
        
        print("✅ Model Bundle loaded successfully")
        print(f"   - Model: AdaBoostClassifier")
        print(f"   - Scaler: StandardScaler")
        print(f"   - Features: {bundle['feature_names']}")
        print(f"   - Classes: {label_classes}")
        return True
    except Exception as e:
        print(f"❌ Error loading bundle: {e}")
        return False

# Load bundle saat startup
load_model_bundle()

# ================= ENDPOINTS =================
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'name': 'Aang Air Quality ML API',
        'version': '3.0.0',
        'model': 'AdaBoost Classifier + StandardScaler',
        'platform': 'Google Cloud Run',
        'accuracy': '96.37%',
        'features': ['temperature', 'co2', 'pm25', 'humidity'],
        'classes': label_classes,
        'endpoints': {
            '/': 'API info',
            '/health': 'Health check',
            '/predict': 'POST - Predict air quality'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'scaler_loaded': scaler is not None,
        'model_type': 'AdaBoost + StandardScaler'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict air quality from sensor data
    
    Request body:
    {
        "temperature": 26.5,
        "co2": 450,
        "pm25": 35,
        "humidity": 65
    }
    
    Response:
    {
        "prediction": 0,
        "label": "TCI Comfort & IAQI Good",
        "confidence": 0.85,
        "probabilities": {...}
    }
    """
    try:
        if model is None or scaler is None:
            return jsonify({'error': 'Model or scaler not loaded'}), 500
            
        data = request.get_json()
        
        # Validate input
        required_fields = ['temperature', 'co2', 'pm25', 'humidity']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400
        
        # Extract values
        temp = float(data['temperature'])
        co2 = float(data['co2'])
        pm25 = float(data['pm25'])
        humidity = float(data['humidity'])
        
        # Prepare input array (sesuai urutan training: air_temperature, CO2, pm2_5, humidity)
        input_raw = np.array([[temp, co2, pm25, humidity]])
        
        # Scale input using trained scaler
        input_scaled = scaler.transform(input_raw)
        
        # Predict
        prediction = model.predict(input_scaled)[0]
        probabilities = model.predict_proba(input_scaled)[0]
        
        # Get label
        prediction_label = label_classes[int(prediction)] if int(prediction) < len(label_classes) else 'Unknown'
        confidence = float(max(probabilities))
        
        # Build probability dict
        prob_dict = {}
        for i, label in enumerate(label_classes):
            if i < len(probabilities):
                prob_dict[label] = float(probabilities[i])
        
        return jsonify({
            'prediction': int(prediction),
            'label': prediction_label,
            'confidence': confidence,
            'probabilities': prob_dict,
            'input': {
                'temperature': temp,
                'co2': co2,
                'pm25': pm25,
                'humidity': humidity
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ================= MAIN =================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
