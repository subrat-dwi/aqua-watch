# aquifer/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import timedelta
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Dynamically list CSV files in the directory
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILES = [f for f in os.listdir(DATA_DIR) if f.endswith('.csv')]

CITY_INFO = {
    'bhubaneswar_odisha.csv': {'name': 'Bhubaneswar, Odisha', 'coords': [20.2961, 85.8245]},
    'jaipur_rajasthan.csv': {'name': 'Jaipur, Rajasthan', 'coords': [26.9124, 75.7873]},
    'nagpur_maharashtra.csv': {'name': 'Nagpur, Maharashtra', 'coords': [21.1458, 79.0882]}
}

@app.route('/api/well-data')
def get_well_data():
    source = request.args.get('source', CSV_FILES[0] if CSV_FILES else None)
    if not source or source not in CSV_FILES:
        return jsonify({'error': 'Invalid source'}), 400
    df = pd.read_csv(os.path.join(DATA_DIR, source))
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by='Date')
    N = 90
    df_recent = df.tail(N).copy()
    window = 5
    df_recent['Smoothed_Level'] = df_recent['Water_Level_m'].rolling(window=window, min_periods=1).mean()
    data = {
        'dates': df_recent['Date'].dt.strftime('%Y-%m-%d').tolist(),
        'levels': df_recent['Smoothed_Level'].tolist()
    }
    return jsonify(data)

@app.route('/api/predict')
def get_prediction():
    source = request.args.get('source', CSV_FILES[0] if CSV_FILES else None)
    if not source or source not in CSV_FILES:
        return jsonify({'error': 'Invalid source'}), 400
    df = pd.read_csv(os.path.join(DATA_DIR, source))
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by='Date')
    
    # Use the same data processing as well-data endpoint for consistency
    N = 90
    df_recent = df.tail(N).copy()
    window = 5
    df_recent['Smoothed_Level'] = df_recent['Water_Level_m'].rolling(window=window, min_periods=1).mean()
    
    # Use sequential index instead of day_of_year for better trend continuation
    df_recent = df_recent.reset_index(drop=True)
    X = df_recent.index.values.reshape(-1, 1)  # Sequential days: 0, 1, 2, 3...
    y = df_recent['Smoothed_Level']
    
    model = LinearRegression()
    model.fit(X, y)
    
    # Get last values for continuity check
    last_date = df_recent['Date'].iloc[-1]
    last_smoothed_value = df_recent['Smoothed_Level'].iloc[-1]
    
    # Predict future values continuing the sequence
    future_dates = [last_date + timedelta(days=i) for i in range(1, 31)]
    future_X = np.array([len(df_recent) + i for i in range(30)]).reshape(-1, 1)
    predicted_levels = model.predict(future_X)
    
    # Ensure continuity by adjusting first prediction to match last historical value
    if len(predicted_levels) > 0:
        adjustment = last_smoothed_value - predicted_levels[0]
        predicted_levels = predicted_levels + adjustment
    
    prediction_data = {
        'future_dates': [date.strftime('%Y-%m-%d') for date in future_dates],
        'predicted_levels': predicted_levels.tolist()
    }
    return jsonify(prediction_data)

@app.route('/api/analysis')
def get_analysis():
    source = request.args.get('source', CSV_FILES[0] if CSV_FILES else None)
    if not source or source not in CSV_FILES:
        return jsonify({'error': 'Invalid source'}), 400
    df = pd.read_csv(os.path.join(DATA_DIR, source))
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by='Date')
    
    # Use same smoothed data processing for consistency
    N = 90
    df_recent = df.tail(N).copy()
    window = 5
    df_recent['Smoothed_Level'] = df_recent['Water_Level_m'].rolling(window=window, min_periods=1).mean()
    
    # Use the most recent smoothed level for analysis
    last_level = df_recent['Smoothed_Level'].iloc[-1]
    
    critical_threshold = 2.15
    semi_critical_threshold = 2.25
    if last_level < critical_threshold:
        condition = "Critical 🔴"
        steps = [
            "Advise immediate reduction in agricultural pumping.",
            "Prioritize this area for the Jal Shakti Abhiyan campaign.",
            "Consider temporary restrictions on new borewells."
        ]
    elif last_level < semi_critical_threshold:
        condition = "Semi-Critical 🟡"
        steps = [
            "Launch a public awareness campaign for water conservation.",
            "Promote micro-irrigation techniques (drip, sprinklers).",
            "Conduct an audit of industrial water usage."
        ]
    else:
        condition = "Safe 🟢"
        steps = [
            "Promote rainwater harvesting structures for continued recharge.",
            "Maintain and monitor existing water bodies.",
            "Continue regular data monitoring to track trends."
        ]
    analysis_data = {'condition': condition, 'steps': steps}
    return jsonify(analysis_data)

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
