from fastapi import FastAPI, HTTPException, Form  # Add Form here
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import json
import os
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Persistent storage path
DATA_DIR = '/opt/render/data'  # Render's persistent disk path
DATA_FILE = os.path.join(DATA_DIR, 'analytics_data.json')

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data model for daily stats
class DailyStats(BaseModel):
    date: str
    weight: float
    calories: float
    protein: float

# Data model for lift entry
class LiftEntry(BaseModel):
    exercise: str
    weight: float
    week: int

# Data model for lift day
class LiftDay(BaseModel):
    day: str
    exercises: List[str]
    entries: Dict[str, List[LiftEntry]]

# Data model for full data
class AnalyticsData(BaseModel):
    daily_stats: List[DailyStats]
    lift_days: Dict[str, LiftDay]

# Initialize data file if it doesn't exist
def init_data_file():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    if not os.path.exists(DATA_FILE):
        initial_data = {
            "daily_stats": [],
            "lift_days": {
                "Day 1": {"day": "Day 1", "exercises": [], "entries": {}},
                "Day 2": {"day": "Day 2", "exercises": [], "entries": {}},
                "Day 3": {"day": "Day 3", "exercises": [], "entries": {}},
                "Day 4": {"day": "Day 4", "exercises": [], "entries": {}}
            }
        }
        with open(DATA_FILE, 'w') as f:
            json.dump(initial_data, f, indent=2)

# Load data from file
def load_data() -> AnalyticsData:
    init_data_file()
    with open(DATA_FILE, 'r') as f:
        return AnalyticsData(**json.load(f))

# Save data to file
def save_data(data: AnalyticsData):
    with open(DATA_FILE, 'w') as f:
        json.dump(data.dict(), f, indent=2)

@app.get("/", response_class=HTMLResponse)
async def get_homepage():
    with open("templates/index.html", "r") as file:
        return file.read()

@app.get("/data")
async def get_data():
    return load_data()

@app.post("/daily_stats")
async def add_daily_stats(stats: DailyStats):
    data = load_data()
    data.daily_stats.append(stats)
    save_data(data)
    return {"message": "Daily stats added"}

@app.post("/lift/{day}/exercise")
async def add_exercise(day: str, exercise: str = Form(...)):
    data = load_data()
    if day not in data.lift_days:
        raise HTTPException(status_code=400, detail="Invalid lift day")
    if exercise not in data.lift_days[day].exercises:
        data.lift_days[day].exercises.append(exercise)
        data.lift_days[day].entries[exercise] = []
    save_data(data)
    return {"message": f"Exercise {exercise} added to {day}"}

@app.delete("/lift/{day}/exercise/{exercise}")
async def delete_exercise(day: str, exercise: str):
    data = load_data()
    if day not in data.lift_days or exercise not in data.lift_days[day].exercises:
        raise HTTPException(status_code=400, detail="Exercise or day not found")
    data.lift_days[day].exercises.remove(exercise)
    del data.lift_days[day].entries[exercise]
    save_data(data)
    return {"message": f"Exercise {exercise} deleted from {day}"}

@app.post("/lift/{day}/entry")
async def add_lift_entry(day: str, entry: LiftEntry):
    data = load_data()
    if day not in data.lift_days or entry.exercise not in data.lift_days[day].exercises:
        raise HTTPException(status_code=400, detail="Exercise or day not found")
    data.lift_days[day].entries[entry.exercise].append(entry)
    save_data(data)
    return {"message": f"Entry added for {entry.exercise} in {day}"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=int(os.getenv("PORT", 8000)))
