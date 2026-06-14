# AutoForge AI MVP

Prompt-to-vehicle workflow:

`Prompt -> structured specification -> deterministic asset selection -> editable 3D digital twin`

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Gemini and PostgreSQL are enabled when `GEMINI_API_KEY` and `DATABASE_URL` are
set. Without them, the backend uses deterministic prompt extraction and a local
SQLite database so the complete MVP remains runnable.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Vehicle assets

The provided Blender sources are registered in `assets/model-catalog.json`.
Export them as GLB and place the results in `frontend/public/models/`:

- `chevrolet-suv.glb`
- `mercedes-sedan.glb`
- `mahindra-thar.glb`
- `rover-sports.glb`

Until those exports exist, the configurator renders a procedural vehicle using
the same configuration contract.

Example export:

```powershell
& "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" `
  --background "C:\Users\LENOVO\Desktop\final mercedes.blend" `
  --python "C:\Users\LENOVO\Desktop\Auto_Forge\scripts\export_vehicle.py" `
  -- "C:\Users\LENOVO\Desktop\Auto_Forge\frontend\public\models\mercedes-sedan.glb"
```
