
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
    getFirestore,
    doc,
    onSnapshot,
    updateDoc,
    increment,
    setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


// ======================================================
// FIREBASE KONFIGURACIJA
// ======================================================

const firebaseConfig = {
    apiKey: "AIzaSyBM0Z7cWAezqeu-r3hy0gGQ2KoWAbzaeTk",
    authDomain: "kestenijada-44e8a.firebaseapp.com",
    projectId: "kestenijada-44e8a",
    storageBucket: "kestenijada-44e8a.firebasestorage.app",
    messagingSenderId: "1071826668654",
    appId: "1:1826668654:web:541a615d911c5558ab6a7f",
    measurementId: "G-9C6CZ4893N"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const bodoviRef =
    doc(db, "kestenijada", "bodovanje");


// ======================================================
// POPIS RAZREDA
// ======================================================

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


// ======================================================
// COOLDOWN
// ======================================================

const COOLDOWN_MS = 5000;

const STORAGE_KEY =
    "kestenijada-cooldowns";


// ======================================================
// ELEMENTI
// ======================================================

const statusElement =
    document.getElementById("connection-status");

const classButtons =
    document.getElementById("class-buttons");

const adminMessage =
    document.getElementById("admin-message");

const lastUpdated =
    document.getElementById("last-updated");

const resetButton =
    document.getElementById("reset-button");

const masterMessage =
    document.getElementById("master-message");


// ======================================================
// MODE
// ======================================================

const params =
    new URLSearchParams(window.location.search);

const mode =
    params.get("mode");


// ======================================================
// TRENUTNI REZULTATI
// ======================================================

let latestScores = {};


// ======================================================
// COOLDOWN STANJE
// ======================================================

const cooldownEnds =
    new Map();

const cooldownTimers =
    new Map();


// ======================================================
// STATUS / PORUKE
// ======================================================

function setStatus(message, state = "") {

    if (!statusElement) return;

    statusElement.textContent = message;

    statusElement.className = "status";

    if (state) {
        statusElement.classList.add(state);
    }
}


function showAdminMessage(
    message,
    isError = false
) {

    if (!adminMessage) return;

    adminMessage.textContent = message;

    adminMessage.classList.toggle(
        "error",
        isError
    );
}


// ======================================================
// COOLDOWN - LOCAL STORAGE
// ======================================================

function loadCooldowns() {

    try {

        const raw =
            localStorage.getItem(STORAGE_KEY);

        if (!raw) return;

        const data =
            JSON.parse(raw);

        const now =
            Date.now();

        Object.entries(data).forEach(
            ([razred, endsAt]) => {

                if (
                    RAZREDI.includes(razred) &&
                    Number(endsAt) > now
                ) {

                    cooldownEnds.set(
                        razred,
                        Number(endsAt)
                    );

                }

            }
        );

    } catch (e) {

        console.warn(
            "Ne mogu učitati cooldowne:",
            e
        );

    }

}


function saveCooldowns() {

    try {

        const data = {};

        cooldownEnds.forEach(
            (endsAt, razred) => {

                data[razred] = endsAt;

            }
        );

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );

    } catch (e) {

        console.warn(
            "Ne mogu spremiti cooldowne:",
            e
        );

    }

}


// ======================================================
// COOLDOWN LOGIKA
// ======================================================

function isOnCooldown(razred) {

    const endsAt =
        cooldownEnds.get(razred);

    return (
        endsAt !== undefined &&
        Date.now() < endsAt
    );

}


function activateCooldown(
    razred,
    button,
    endsAt
) {

    cooldownEnds.set(
        razred,
        endsAt
    );

    saveCooldowns();

    button.disabled = true;

    button.classList.add(
        "cooldown"
    );


    const updateText = () => {

        const remaining =
            Math.max(
                0,
                endsAt - Date.now()
            );

        const seconds =
            Math.ceil(
                remaining / 1000
            );

        button.textContent =
            `${razred} · ${seconds}s`;

        return remaining;

    };


    updateText();


    const oldTimer =
        cooldownTimers.get(razred);

    if (oldTimer) {
        clearInterval(oldTimer);
    }


    const timerId =
        setInterval(() => {

            if (
                updateText() <= 0
            ) {

                clearInterval(timerId);

                cooldownTimers.delete(
                    razred
                );

                cooldownEnds.delete(
                    razred
                );

                saveCooldowns();

                button.disabled = false;

                button.classList.remove(
                    "cooldown"
                );

                button.textContent =
                    razred;

            }

        }, 150);


    cooldownTimers.set(
        razred,
        timerId
    );

}


function startCooldown(
    razred,
    button
) {

    activateCooldown(
        razred,
        button,
        Date.now() + COOLDOWN_MS
    );

}


// ======================================================
// VRAĆANJE COOLDOWNA NAKON RELOADA
// ======================================================

function restoreActiveCooldowns() {

    if (!classButtons) return;

    cooldownEnds.forEach(
        (endsAt, razred) => {

            if (
                Date.now() >= endsAt
            ) {
                return;
            }

            const button =
                classButtons.querySelector(
                    `[data-razred="${razred}"]`
                );

            if (button) {

                activateCooldown(
                    razred,
                    button,
                    endsAt
                );

            }

        }
    );

}


// ======================================================
// SLANJE BODA
// ======================================================

async function sendPoint(razred) {

    showAdminMessage(
        `Spremam bod za ${razred}...`
    );


    try {

        await updateDoc(
            bodoviRef,
            {
                [razred]: increment(1)
            }
        );


        showAdminMessage(
            `Dodijeljen je 1 bod razredu ${razred}.`
        );


        console.info(
            `Bod dodan razredu: ${razred}`
        );


    } catch (error) {

        console.error(
            "Greška pri spremanju boda:",
            error
        );


        showAdminMessage(
            `Bod za ${razred} nije potvrđen. Provjeri vezu i Firebase pravila.`,
            true
        );

    }

}


// ======================================================
// KLIK NA RAZRED
// ======================================================

function handleClassClick(
    razred,
    button
) {

    if (
        button.disabled ||
        isOnCooldown(razred)
    ) {
        return;
    }


    // Cooldown kreće odmah
    startCooldown(
        razred,
        button
    );


    // Bod ide u pozadini
    sendPoint(razred);

}


// ======================================================
// KREIRANJE GUMBA ZA RAZREDE
// ======================================================

function createClassButtons() {

    if (!classButtons) return;

    classButtons.replaceChildren();


    RAZREDI.forEach(
        razred => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "class-button";


            button.textContent =
                razred;


            button.dataset.razred =
                razred;


            button.addEventListener(
                "click",
                () =>
                    handleClassClick(
                        razred,
                        button
                    )
            );


            classButtons.appendChild(
                button
            );

        }
    );


    loadCooldowns();

    restoreActiveCooldowns();

}


// ======================================================
// TV LJESTVICA
// ======================================================

function renderLeaderboard(scores) {

    const topThree =
        document.getElementById(
            "top-three-leaderboard"
        );

    const restGrid =
        document.getElementById(
            "rest-leaderboard"
        );


    if (!topThree || !restGrid) {
        return;
    }


    topThree.replaceChildren();

    restGrid.replaceChildren();


    const entries =
        RAZREDI.map(
            razred => ({

                razred,

                bodovi:
                    Number(
                        scores[razred] ?? 0
                    )

            })
        );


    entries.sort(
        (a, b) =>
            b.bodovi - a.bodovi ||
            a.razred.localeCompare(
                b.razred,
                "hr"
            )
    );


    let previousScore =
        null;

    let previousRank =
        0;


    entries.forEach(
        (entry, index) => {

            const rank =
                entry.bodovi === previousScore
                    ? previousRank
                    : index + 1;


            previousScore =
                entry.bodovi;

            previousRank =
                rank;


            const medals = {
                1: "🥇",
                2: "🥈",
                3: "🥉"
            };


            // ------------------------------
            // PRVA TRI MJESTA
            // ------------------------------

            if (index < 3) {

                const row =
                    document.createElement(
                        "tr"
                    );


                if (rank === 1) {
                    row.classList.add(
                        "top-one"
                    );
                }


                if (rank === 2) {
                    row.classList.add(
                        "top-two"
                    );
                }


                if (rank === 3) {
                    row.classList.add(
                        "top-three"
                    );
                }


                const placeCell =
                    document.createElement(
                        "td"
                    );


                const classCell =
                    document.createElement(
                        "td"
                    );


                const pointsCell =
                    document.createElement(
                        "td"
                    );


                if (medals[rank]) {

                    const medal =
                        document.createElement(
                            "span"
                        );


                    medal.className =
                        "place-medal";


                    medal.textContent =
                        medals[rank];


                    placeCell.appendChild(
                        medal
                    );

                }


                placeCell.append(
                    `${rank}. mjesto`
                );


                classCell.textContent =
                    entry.razred;


                pointsCell.textContent =
                    entry.bodovi;


                pointsCell.className =
                    "points-cell";


                row.append(
                    placeCell,
                    classCell,
                    pointsCell
                );


                topThree.appendChild(
                    row
                );


            // ------------------------------
            // OSTALA MJESTA
            // ------------------------------

            } else {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "rank-card";


                const place =
                    document.createElement(
                        "div"
                    );


                place.className =
                    "rank-card-place";


                place.textContent =
                    `${rank}. mjesto`;


                const className =
                    document.createElement(
                        "div"
                    );


                className.className =
                    "rank-card-class";


                className.textContent =
                    entry.razred;


                const points =
                    document.createElement(
                        "div"
                    );


                points.className =
                    "rank-card-points";


                points.textContent =
                    `${entry.bodovi} bodova`;


                card.append(
                    place,
                    className,
                    points
                );


                restGrid.appendChild(
                    card
                );

            }

        }
    );


    if (lastUpdated) {

        lastUpdated.textContent =
            "Ažurirano: " +
            new Date().toLocaleTimeString(
                "hr-HR",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );

    }

}


// ======================================================
// MASTER - RESET SVIH BODOVA
// ======================================================

async function resetAllScores() {

    const potvrda =
        confirm(
            "Jesi li SIGURAN da želiš resetirati sve bodove na 0?"
        );


    if (!potvrda) {
        return;
    }


    if (!resetButton || !masterMessage) {
        return;
    }


    resetButton.disabled =
        true;


    masterMessage.classList.remove(
        "error"
    );


    masterMessage.textContent =
        "Resetiram bodove...";


    try {

        const resetData = {};


        RAZREDI.forEach(
            razred => {

                resetData[razred] =
                    0;

            }
        );


        await setDoc(
            bodoviRef,
            resetData
        );


        masterMessage.textContent =
            "✓ Svi bodovi uspješno su postavljeni na 0.";


        console.info(
            "Svi bodovi resetirani."
        );


    } catch (error) {

        console.error(
            "Greška pri resetiranju:",
            error
        );


        masterMessage.classList.add(
            "error"
        );


        masterMessage.textContent =
            "Greška pri resetiranju. Provjeri Firebase pravila.";

    } finally {

        resetButton.disabled =
            false;

    }

}


// ======================================================
// REALTIME FIREBASE LISTENER
// ======================================================

function startRealtimeListener() {

    setStatus(
        "Povezivanje s Firebaseom..."
    );


    onSnapshot(

        bodoviRef,


        snapshot => {

            if (!snapshot.exists()) {

                setStatus(
                    "Dokument ne postoji",
                    "offline"
                );


                const topThree =
                    document.getElementById(
                        "top-three-leaderboard"
                    );


                if (topThree) {

                    topThree.replaceChildren();


                    const row =
                        document.createElement(
                            "tr"
                        );


                    const cell =
                        document.createElement(
                            "td"
                        );


                    cell.colSpan =
                        3;


                    cell.className =
                        "empty-state";


                    cell.textContent =
                        "U Firestoreu nedostaje dokument kestenijada/bodovanje.";


                    row.appendChild(
                        cell
                    );


                    topThree.appendChild(
                        row
                    );

                }


                showAdminMessage(
                    "Nedostaje dokument kestenijada/bodovanje.",
                    true
                );


                return;

            }


            latestScores =
                snapshot.data();


            setStatus(
                "Povezano",
                "online"
            );


            if (mode === "tv") {

                renderLeaderboard(
                    latestScores
                );

            }

        },


        error => {

            console.error(
                "Firestore listener greška:",
                error
            );


            setStatus(
                "Greška veze ili pristupa",
                "offline"
            );


            if (mode === "admin") {

                showAdminMessage(
                    "Nije moguće čitati podatke. Provjeri Firebase pravila.",
                    true
                );

            }

        }

    );

}


// ======================================================
// POKRETANJE
// ======================================================

if (mode === "admin") {

    createClassButtons();

}


if (mode === "tv") {

    renderLeaderboard({});

}


if (mode === "master") {

    if (resetButton) {

        resetButton.addEventListener(
            "click",
            resetAllScores
        );

    }

}


startRealtimeListener();
