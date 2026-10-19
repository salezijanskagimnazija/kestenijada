
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getFirestore,
    doc,
    onSnapshot,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Firebase konfiguracija
const firebaseConfig = {
    apiKey: "AIzaSyBM0Z7cWAezqeu-r3hy0gGQ2KoWAbzaeTk",
    authDomain: "kestenijada-44e8a.firebaseapp.com",
    projectId: "kestenijada-44e8a",
    storageBucket: "kestenijada-44e8a.firebasestorage.app",
    messagingSenderId: "1071826668654",
    appId: "1:1826668654:web:541a615d911c5558ab6a7f",
    measurementId: "G-9C6CZ4893N"
};

// Inicijalizacija Firebasea
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Postojeći dokument u Firestoreu:
// kestenijada (collection) -> bodovi (document)
const bodoviRef = doc(db, "kestenijada", "bodovanje");

// PRIVREMENI POPIS RAZREDA
// Zamijeni ga svim stvarnim razredima.
const RAZREDI = [
    "1k",
    "1sa",
    "1sb",
    "2k",
    "2sa",
    "2sb",
    "3k",
    "3sa",
    "3sb",
    "4k",
    "4sa",
    "4sb"
];

// Elementi sučelja
const statusElement = document.getElementById("connection-status");
const classButtons = document.getElementById("class-buttons");
const selectedClassElement = document.getElementById("selected-class");
const addPointButton = document.getElementById("add-point");
const adminMessage = document.getElementById("admin-message");
const leaderboard = document.getElementById("leaderboard");
const lastUpdated = document.getElementById("last-updated");

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

// Odabrani razred i zaštita od dvostrukog klika
let selectedClass = null;
let isSaving = false;
let latestScores = {};

// Prikaz statusa veze
function setStatus(message, state = "") {
    statusElement.textContent = message;
    statusElement.className = "status";

    if (state) {
        statusElement.classList.add(state);
    }
}

// Prikaz poruke animatoru
function showAdminMessage(message, isError = false) {
    adminMessage.textContent = message;
    adminMessage.classList.toggle("error", isError);
}

// Generiranje gumba za razrede
function createClassButtons() {
    classButtons.replaceChildren();

    RAZREDI.forEach(razred => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "class-button";
        button.textContent = razred;
        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", () => {
            selectedClass = razred;

            document.querySelectorAll(".class-button").forEach(item => {
                const isSelected = item.textContent === razred;

                item.classList.toggle("selected", isSelected);
                item.setAttribute(
                    "aria-pressed",
                    String(isSelected)
                );
            });

            selectedClassElement.replaceChildren();

            const label = document.createElement("span");
            label.textContent = "Odabrani razred: ";

            const strong = document.createElement("strong");
            strong.textContent = razred;

            selectedClassElement.append(label, strong);

            addPointButton.disabled = isSaving;
            showAdminMessage("Spremno za dodavanje boda.");
        });

        classButtons.appendChild(button);
    });
}

// Dodavanje jednog boda
async function addPoint() {
    if (!selectedClass || isSaving) {
        return;
    }

    isSaving = true;
    addPointButton.disabled = true;

    const razredZaUpis = selectedClass;

    addPointButton.textContent = "SPREMANJE...";
    showAdminMessage("Spremam bod...");

    try {
    await updateDoc(bodoviRef, {
        [razredZaUpis]: increment(1)
    });

    showAdminMessage(
        `Dodijeljen je 1 bod razredu ${razredZaUpis}.`
    );

    console.info(`Bod dodan razredu: ${razredZaUpis}`);
} catch (error) {
    console.error("Greška pri spremanju boda:", error);

    showAdminMessage(
        "Bod nije potvrđen. Provjeri vezu i Firebase pravila.",
        true
    );
} finally {
    isSaving = false;
    addPointButton.textContent = "+1 BOD";
    addPointButton.disabled = !selectedClass;
}
}

addPointButton.addEventListener("click", addPoint);

// Prikaz TV ljestvice

function renderLeaderboard(scores) {
    const topThree = document.getElementById("top-three-leaderboard");
    const restGrid = document.getElementById("rest-leaderboard");

    topThree.replaceChildren();
    restGrid.replaceChildren();

    const entries = RAZREDI.map(razred => ({
        razred,
        bodovi: Number(scores[razred] ?? 0)
    }));

    // Sortiranje od najvećeg prema najmanjem broju bodova.
    entries.sort((a, b) =>
        b.bodovi - a.bodovi ||
        a.razred.localeCompare(b.razred, "hr")
    );

    let previousScore = null;
    let previousRank = 0;

    entries.forEach((entry, index) => {
        // Zadržavamo postojeće pravilo za izjednačene rezultate.
        const rank = entry.bodovi === previousScore
            ? previousRank
            : index + 1;

        previousScore = entry.bodovi;
        previousRank = rank;

        const medals = {
            1: "🥇",
            2: "🥈",
            3: "🥉"
        };

        if (index < 3) {
            // PRVA TRI RAZREDA: zasebni redovi u tablici.
            const row = document.createElement("tr");

            if (rank === 1) row.classList.add("top-one");
            if (rank === 2) row.classList.add("top-two");
            if (rank === 3) row.classList.add("top-three");

            const placeCell = document.createElement("td");
            const classCell = document.createElement("td");
            const pointsCell = document.createElement("td");

            if (medals[rank]) {
                const medal = document.createElement("span");
                medal.className = "place-medal";
                medal.textContent = medals[rank];
                placeCell.appendChild(medal);
            }

            placeCell.append(`${rank}. mjesto`);
            classCell.textContent = entry.razred;
            pointsCell.textContent = entry.bodovi;
            pointsCell.className = "points-cell";

            row.append(placeCell, classCell, pointsCell);
            topThree.appendChild(row);

        } else {
            // OD 4. MJESTA NADALJE: kartice u mreži od 3 stupca.
            const card = document.createElement("div");
            card.className = "rank-card";

            const place = document.createElement("div");
            place.className = "rank-card-place";
            place.textContent = `${rank}. mjesto`;

            const className = document.createElement("div");
            className = Object.assign(
                document.createElement("div"),
                { className: "rank-card-class" }
            );
            className.textContent = entry.razred;

            const points = document.createElement("div");
            points.className = "rank-card-points";
            points.textContent = `${entry.bodovi} bodova`;

            card.append(place, className, points);
            restGrid.appendChild(card);
        }
    });

    lastUpdated.textContent =
        "Ažurirano: " +
        new Date().toLocaleTimeString("hr-HR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
}


// Slušanje promjena u Firestore dokumentu.
// Isti listener ažurira TV i lokalni prikaz nakon upisa.
function startRealtimeListener() {
    setStatus("Povezivanje s Firebaseom...");

    onSnapshot(
        bodoviRef,
        snapshot => {
            if (!snapshot.exists()) {
                setStatus("Dokument ne postoji", "offline");

                leaderboard.replaceChildren();

                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 3;
                cell.className = "empty-state";
                cell.textContent =
                    "U Firestoreu nedostaje dokument kestenijada/bodovi.";

                row.appendChild(cell);
                leaderboard.appendChild(row);

                showAdminMessage(
                    "Nedostaje dokument kestenijada/bodovi.",
                    true
                );

                return;
            }

            latestScores = snapshot.data();

            setStatus("Povezano", "online");

            if (mode === "tv") {
                renderLeaderboard(latestScores);
            }
        },
        error => {
            console.error("Firestore listener greška:", error);

            setStatus("Greška veze ili pristupa", "offline");

            if (mode === "admin") {
                showAdminMessage(
                    "Nije moguće čitati podatke. Provjeri Firebase pravila.",
                    true
                );
            }
        }
    );
}

// Pokretanje odgovarajućeg prikaza
if (mode === "admin") {
    createClassButtons();
}

if (mode === "tv") {
    renderLeaderboard({});
}

startRealtimeListener();
