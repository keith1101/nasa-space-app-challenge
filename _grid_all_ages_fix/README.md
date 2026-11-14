# Remove 6-hour rejection for FIRMS grid scenarios

Apply only after NASA_Live_Experimental_Grid_Patch.zip. Two files replace the prior versions. No new API keys or dependencies.

```powershell
cd 'D:\NASA Hackathon'
Expand-Archive '.\NASA_Grid_All_Ages_Fix.zip' '.\_grid_all_ages_fix' -Force
Copy-Item '.\_grid_all_ages_fix\backend\live_experimental_grid.py' '.\backend\' -Force
Copy-Item '.\_grid_all_ages_fix\frontend\src\App.tsx' '.\frontend\src\' -Force
cd .\frontend
npm run build
cd ..
python .\backend\server.py
```

Stop the old backend with Ctrl+C before restarting it. Keep FIRMS_MAP_KEY in that same shell. Refresh the browser with Ctrl+F5. Test the earlier 3 coordinates using /api/live-experimental-grid. Expected HTTP 200 and observation_status=older_detection if weather and raster are available. Horizons are from current forecast; for older detections colored cells are conditional scenarios **if fire remains active**, not observed live spread, probabilities, remaining burn lifetime, or proof of burning. Weather/network/raster failures can still produce 503 with detail; do not fabricate cells in those cases.
