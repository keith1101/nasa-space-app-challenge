# Pilot labels for two fire prediction tasks

Patch only. Copy `backend/build_pilot_labels.py` into the existing project's `backend` directory. Requires the three downloaded `data/training/pilot/VIIRS_NOAA20_SP_*_5d.csv` files and `data/training/pilot/weather_hourly.json` from the chat instructions.

PowerShell:

```powershell
cd 'D:\NASA Hackathon'
Copy-Item '.\_pilot_patch\backend\build_pilot_labels.py' '.\backend\' -Force
python .\backend\build_pilot_labels.py
Import-Csv '.\data\training\pilot\processed\pilot_observation_labels.csv' | Select-Object -First 3 | Format-List
Get-Content '.\data\training\pilot\processed\pilot_report.json'
```

The script parses FIRMS `acq_date` + zero-padded `acq_time` as UTC and joins NASA POWER hourly fields (T2M, RH2M, WS10M, WD10M, PRECTOTCORR). It uses 0.02-degree grid cells and a 3 km repeat-detection radius. `observed_repeat_6h/12h/24h=1` means a subsequent detection near the same point within that interval; `observed_neighbor_*h=1` means a subsequent detection in an adjacent grid cell. Blank means **unknown**, never `0`. `weather_window_complete` describes only weather coverage, not satellite coverage. This is not ground-truth fire extinction, duration, physical perimeter propagation, or a trained model. The POWER pilot weather is a single location and must not be applied across a large region for a production model.

To train a credible duration model, collect fire incident/perimeter timelines with trusted end dates or define survival intervals and censoring. To train a spread model with negative cells, collect observation coverage/footprints or daily burned area/perimeter labels for candidate neighboring cells, with spatial and temporal train/test separation. Use forecast runs as issued at each historical decision time (not the future actual weather). A 15-day/81-detection pilot does not supply enough validated negative or event-ending labels; the script intentionally refuses to manufacture them.
