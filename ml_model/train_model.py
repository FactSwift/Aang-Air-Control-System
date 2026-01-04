# Air Quality Classification Model - AdaBoost with SMOTE & Scaling
# Sesuai dengan notebook training

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import AdaBoostClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score
from imblearn.over_sampling import SMOTE
from collections import Counter
import pickle
import json

# ================= LOAD DATA =================
def load_and_prepare_data(csv_path):
    """Load dan persiapkan data untuk training"""
    df = pd.read_csv(csv_path)
    
    print("📊 Data Shape:", df.shape)
    print("\n📋 Columns:", df.columns.tolist())
    print("\n🏷️ Label Distribution:")
    print(df['Air_Quality_Label'].value_counts())
    
    return df

# ================= TRAIN ADABOOST MODEL =================
def train_adaboost_model(csv_path):
    """Train AdaBoost dengan SMOTE dan StandardScaler (sesuai notebook)"""
    
    # Load data
    df = pd.read_csv(csv_path)
    print("📊 Data Shape:", df.shape)
    
    # Features (4 features only)
    X = df[['air_temperature', 'CO2', 'pm2_5', 'humidity']]
    
    # Encode labels
    le = LabelEncoder()
    y = le.fit_transform(df['Air_Quality_Label'])
    
    print("\n🏷️ Label Encoding:")
    for class_name, encoded_value in zip(le.classes_, range(len(le.classes_))):
        print(f"  {class_name}: {encoded_value}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print("\n📈 Class distribution before SMOTE:")
    print(Counter(y_train))
    
    # Apply SMOTE
    smote = SMOTE(random_state=42)
    X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)
    
    print("\n📈 Class distribution after SMOTE:")
    print(Counter(y_train_smote))
    
    # Scale features
    scaler = StandardScaler()
    X_train_smote_scaled = scaler.fit_transform(X_train_smote)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n📏 Scaler Parameters:")
    print(f"  Mean: {scaler.mean_}")
    print(f"  Std:  {scaler.scale_}")
    
    # Train AdaBoost
    print("\n🚀 Training AdaBoost Classifier...")
    adaboost_classifier = AdaBoostClassifier(random_state=42)
    adaboost_classifier.fit(X_train_smote_scaled, y_train_smote)
    
    # Predict
    y_pred = adaboost_classifier.predict(X_test_scaled)
    
    # Evaluate
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    print("\n" + "=" * 50)
    print("🎯 MODEL EVALUATION")
    print("=" * 50)
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    
    print("\n📈 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    return adaboost_classifier, scaler, le

# ================= SAVE MODEL + SCALER =================
def save_model_bundle(model, scaler, label_encoder, output_path='adaboost_bundle.pkl'):
    """Save model, scaler, dan label encoder sebagai satu bundle"""
    
    bundle = {
        'model': model,
        'scaler': scaler,
        'label_encoder': label_encoder,
        'feature_names': ['air_temperature', 'CO2', 'pm2_5', 'humidity'],
        'classes': label_encoder.classes_.tolist()
    }
    
    with open(output_path, 'wb') as f:
        pickle.dump(bundle, f)
    
    print(f"\n✅ Model bundle saved to: {output_path}")
    print(f"   - Model: AdaBoostClassifier")
    print(f"   - Scaler: StandardScaler")
    print(f"   - Features: {bundle['feature_names']}")
    print(f"   - Classes: {bundle['classes']}")
    
    return bundle

# ================= MAIN =================
if __name__ == "__main__":
    csv_path = "air_quality_with_labels.csv"
    
    print("=" * 60)
    print("🌬️ AANG AIR QUALITY - AdaBoost Model Training")
    print("=" * 60)
    
    # Train model
    model, scaler, le = train_adaboost_model(csv_path)
    
    # Save bundle
    save_model_bundle(model, scaler, le, 'adaboost_air_quality_bundle.pkl')
    
    # Test prediction
    print("\n" + "=" * 60)
    print("🧪 TEST PREDICTION")
    print("=" * 60)
    
    # Load bundle
    with open('adaboost_air_quality_bundle.pkl', 'rb') as f:
        bundle = pickle.load(f)
    
    # Sample input
    sample_raw = np.array([[26.5, 450, 35, 65]])  # temp, co2, pm25, humidity
    sample_scaled = bundle['scaler'].transform(sample_raw)
    prediction = bundle['model'].predict(sample_scaled)
    proba = bundle['model'].predict_proba(sample_scaled)
    
    print(f"\n📥 Input: Temp=26.5°C, CO2=450ppm, PM2.5=35µg/m³, Humidity=65%")
    print(f"📤 Prediction: {bundle['classes'][prediction[0]]}")
    print(f"📊 Confidence: {max(proba[0]) * 100:.2f}%")
    print(f"📊 Probabilities:")
    for i, cls in enumerate(bundle['classes']):
        print(f"   {cls}: {proba[0][i]*100:.2f}%")
