# Fix missing backend.fire_risk

Use this fix after the NASA_Live_Prediction_Input_Patch. This patch replaces only backend/server.py and backend/live_prediction_input.py. backend/fire_risk.py is optional; /api/fire-risk returns 503 when absent. /api/live-prediction-input does not import it.

PowerShell:

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Live_Prediction_Input_Fix.zip' '.\_live_input_fix' -Force
Copy-Item '.\_live_input_fix\backend\server.py' '.\backend\server.py' -Force
Copy-Item '.\_live_input_fix\backend\live_prediction_input.py' '.\backend\live_prediction_input.py' -Force
python .\backend\server.py
```

Start server in one terminal and query it in a second terminal. FIRMS_MAP_KEY must be set in the first terminal. Do not send the key to others.
