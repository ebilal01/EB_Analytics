const BASE_URL = "https://eb-analytics.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
    setupEventListeners();
});

function setupEventListeners() {
    // Daily Stats Form
    document.getElementById("daily-stats-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            date: formData.get("date"),
            weight: parseFloat(formData.get("weight")),
            calories: parseFloat(formData.get("calories")),
            protein: parseFloat(formData.get("protein"))
        };
        await fetch(`${BASE_URL}/daily_stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        e.target.reset();
        fetchData();
    });

    // Lift Day Buttons
    document.querySelectorAll(".lift-day-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".lift-day-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadLiftDay(btn.dataset.day);
        });
    });

    // Add Exercise Form
    document.getElementById("add-exercise-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const day = document.getElementById("current-day").dataset.day;
        await fetch(`${BASE_URL}/lift/${day}/exercise`, {
            method: "POST",
            body: formData
        });
        e.target.reset();
        loadLiftDay(day);
    });
}

async function fetchData() {
    const response = await fetch(`${BASE_URL}/data`);
    const data = await response.json();
    updateDailyStatsGraphs(data.daily_stats);
}

function updateDailyStatsGraphs(stats) {
    const dates = stats.map(s => s.date);
    const weights = stats.map(s => s.weight);
    const calories = stats.map(s => s.calories);
    const proteins = stats.map(s => s.protein);

    const config = { responsive: true, displayModeBar: false };

    Plotly.newPlot("weight-graph", [{
        x: dates,
        y: weights,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "blue" }
    }], {
        title: "Weight (lbs)",
        xaxis: { title: "Date" },
        yaxis: { title: "Weight (lbs)" },
        margin: { t: 40, b: 60, l: 60, r: 20 },
        height: 250
    }, config);

    Plotly.newPlot("calories-graph", [{
        x: dates,
        y: calories,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "green" }
    }], {
        title: "Calories (kcal)",
        xaxis: { title: "Date" },
        yaxis: { title: "Calories (kcal)" },
        margin: { t: 40, b: 60, l: 60, r: 20 },
        height: 250
    }, config);

    Plotly.newPlot("protein-graph", [{
        x: dates,
        y: proteins,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "red" }
    }], {
        title: "Protein (g)",
        xaxis: { title: "Date" },
        yaxis: { title: "Protein (g)" },
        margin: { t: 40, b: 60, l: 60, r: 20 },
        height: 250
    }, config);
}

async function loadLiftDay(day) {
    document.getElementById("current-day").textContent = day;
    document.getElementById("current-day").dataset.day = day;
    document.getElementById("add-exercise-form").style.display = "block";

    const response = await fetch(`${BASE_URL}/data`);
    const data = await response.json();
    const liftDay = data.lift_days[day];
    const exercisesContainer = document.getElementById("exercises");
    exercisesContainer.innerHTML = "";

    liftDay.exercises.forEach(exercise => {
        const container = document.createElement("div");
        container.className = "exercise-container";
        container.innerHTML = `
            <div class="exercise-header">
                <h3>${exercise}</h3>
                <button class="delete-btn" data-exercise="${exercise}">Delete</button>
            </div>
            <form class="lift-entry-form" data-exercise="${exercise}">
                <label>Weight (lbs): <input type="number" name="weight" step="0.1" required></label>
                <label>Week: <input type="number" name="week" required></label>
                <button type="submit">Add Entry</button>
            </form>
            <div id="${exercise}-graph" class="graph"></div>
        `;
        exercisesContainer.appendChild(container);

        // Plot exercise graph
        const entries = liftDay.entries[exercise] || [];
        const weeks = entries.map(e => `Week ${e.week}`);
        const weights = entries.map(e => e.weight);
        Plotly.newPlot(`${exercise}-graph`, [{
            x: weeks,
            y: weights,
            type: "scatter",
            mode: "lines+markers",
            line: { color: "purple" }
        }], {
            title: `${exercise} Progress`,
            xaxis: { title: "Week" },
            yaxis: { title: "Weight (lbs)" },
            margin: { t: 40, b: 60, l: 60, r: 20 },
            height: 250
        }, { responsive: true, displayModeBar: false });

        // Delete exercise
        container.querySelector(".delete-btn").addEventListener("click", async () => {
            await fetch(`${BASE_URL}/lift/${day}/exercise/${exercise}`, { method: "DELETE" });
            loadLiftDay(day);
        });

        // Add lift entry
        container.querySelector(".lift-entry-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const entry = {
                exercise,
                weight: parseFloat(formData.get("weight")),
                week: parseInt(formData.get("week"))
            };
            await fetch(`${BASE_URL}/lift/${day}/entry`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entry)
            });
            e.target.reset();
            loadLiftDay(day);
        });
    });
}
