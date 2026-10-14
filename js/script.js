
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// FIREBASE KONFIGURACIJA
const firebaseConfig = {
    apiKey: "AIzaSyB94RIhh5cM_4QyOy61d9aFdezVZsr5-iY",
    authDomain: "kestenijada-7dd34.firebaseapp.com",
    databaseURL: "https://kestenijada-7dd34-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kestenijada-7dd34",
    storageBucket: "kestenijada-7dd34.firebasestorage.app",
    messagingSenderId: "618331428006",
    appId: "1:618331428006:web:c6ee16bacfb2dd977e1067"
};

// POVEZIVANJE S FIREBASEOM
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// NAZIVI I REDOSLIJED RAZREDA
const classNames = {
    "1sa": "1.sa",
    "1sb": "1.sb",
    "1k": "1.k"
};

const classOrder = ["1sa", "1sb", "1k"];

// HTML ELEMENTI
const loginSection = document.getElementById("loginSection");
const animatorSection = document.getElementById("animatorSection");
const leaderboardSection = document.getElementById("leaderboardSection");

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const classSelect = document.getElementById("classSelect");
const addPointButton = document.getElementById("addPointButton");
const statusMessage = document.getElementById("statusMessage");

const leaderboardList = document.getElementById("leaderboardList");
const connectionStatus = document.getElementById("connectionStatus");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

// STANJE APLIKACIJE
const isDisplayMode =
    new URLSearchParams(window.location.search).get("rezultati") === "1";

let allClasses = [];
let isSaving = false;
let saveCooldownTimer = null;

// PRIPREMA PRIKAZA ZA TV
if (isDisplayMode) {
    document.body.classList.add("display-mode");

    loginSection.hidden = true;
    animatorSection.hidden = true;
    leaderboardSection.hidden = false;

    pageTitle.textContent = "Poredak Kestenijade";
    pageSubtitle.textContent = "Rezultati se ažuriraju uživo.";
}

// PRIJAVA ANIMATORA
loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (username === "animator" && password === "1111") {
        loginSection.hidden = true;
        animatorSection.hidden = false;
        leaderboardSection.hidden = false;

        loginError.textContent = "";
    } else {
        loginError.textContent =
            "Pogrešno korisničko ime ili lozinka.";
    }
});

// POMOĆNA FUNKCIJA ZA NAZIV RAZREDA
function getClassName(classId) {
    return classNames[classId] || classId;
}

// ISPRAVNO ISPISIVANJE: 1 BOD, 2 BODA, 5 BODOVA
function getPointsLabel(points) {
    const lastTwo = points % 100;
    const lastOne = points % 10;

    if (lastTwo >= 11 && lastTwo <= 14) {
        return "bodova";
    }

    if (lastOne === 1) {
        return "bod";
    }

    if (lastOne >= 2 && lastOne <= 4) {
        return "boda";
    }

    return "bodova";
}

// PUNJENJE PADAJUĆE LISTE
function renderClassOptions() {
    const selectedClass = classSelect.value;

    classSelect.replaceChildren(
        new Option("-- Odaberi razred --", "")
    );

    const sortedClasses = [...allClasses].sort((a, b) => {
        return classOrder.indexOf(a.id) - classOrder.indexOf(b.id);
    });

    sortedClasses.forEach((schoolClass) => {
        const option = new Option(
            getClassName(schoolClass.id),
            schoolClass.id
        );

        classSelect.add(option);
    });

    // ZADRŽI ODABRANI RAZRED KOD AŽURIRANJA
    if (allClasses.some((item) => item.id === selectedClass)) {
        classSelect.value = selectedClass;
    }

    classSelect.disabled = allClasses.length === 0 || isSaving;

    addPointButton.disabled =
        !classSelect.value || isSaving || allClasses.length === 0;
}

// PRIKAZ PORETKA
function renderLeaderboard() {
    leaderboardList.replaceChildren();

    if (allClasses.length === 0) {
        const item = document.createElement("li");
        item.className = "leaderboard-item";
        item.textContent = "Nema razreda u bazi.";

        leaderboardList.append(item);
        return;
    }

    const sortedClasses = [...allClasses].sort((a, b) => {
        return (Number(b.bodovi) || 0) - (Number(a.bodovi) || 0);
    });

    sortedClasses.forEach((schoolClass, index) => {
        const item = document.createElement("li");
        item.className = "leaderboard-item";

        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = index + 1;

        const name = document.createElement("span");
        name.className = "class-name";
        name.textContent = getClassName(schoolClass.id);

        const points = document.createElement("span");
        points.className = "points";

        const totalPoints = Number(schoolClass.bodovi) || 0;

        points.textContent =
            `${totalPoints} ${getPointsLabel(totalPoints)}`;

        item.append(rank, name, points);
        leaderboardList.append(item);
    });
}

// PRAĆENJE FIRESTORE BAZE UŽIVO
onSnapshot(
    collection(db, "classes"),

    (snapshot) => {
        allClasses = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data()
        }));

        renderClassOptions();
        renderLeaderboard();

        connectionStatus.textContent = "● Povezano";
    },

    (error) => {
        console.error("Greška pri čitanju baze:", error);

        connectionStatus.textContent = "Greška povezivanja";

        statusMessage.textContent =
            "Ne mogu učitati podatke. Provjeri Firestore i pravila pristupa.";

        classSelect.disabled = true;
        addPointButton.disabled = true;
    }
);

// REAKCIJA NA ODABIR RAZREDA
classSelect.addEventListener("change", () => {
    addPointButton.disabled =
        !classSelect.value || isSaving || allClasses.length === 0;

    if (classSelect.value) {
        statusMessage.textContent =
            "Odabrani razred: " + getClassName(classSelect.value);
    } else {
        statusMessage.textContent = "Odaberi razred za početak.";
    }
});

// DODAVANJE JEDNOG BODA
addPointButton.addEventListener("click", async () => {
    const classId = classSelect.value;

    // SPRJEČAVANJE VIŠESTRUKOG KLIKA
    if (!classId || isSaving) {
        return;
    }

    isSaving = true;

    classSelect.disabled = true;
    addPointButton.disabled = true;
    addPointButton.textContent = "SPREMANJE...";
    statusMessage.textContent = "Spremam bod...";

    // Osiguraj da prethodno čekanje ne ostane aktivno.
    if (saveCooldownTimer !== null) {
        clearTimeout(saveCooldownTimer);
        saveCooldownTimer = null;
    }

    try {
        const classRef = doc(db, "classes", classId);

        // POVEĆAJ POLJE "bodovi" ZA JEDAN
        await updateDoc(classRef, {
            bodovi: increment(1)
        });

        addPointButton.textContent = "✓ BOD DODAN";
        statusMessage.textContent =
            `Bod je uspješno dodan razredu ${getClassName(classId)}.`;

    } catch (error) {
        console.error("Greška pri dodavanju boda:", error);

        addPointButton.textContent = "GREŠKA";
        statusMessage.textContent =
            "Bod nije spremljen. Provjeri vezu i pokušaj ponovno.";

    } finally {
        // KRATKO ZAKLJUČAVANJE NAKON ZAHTJEVA
        saveCooldownTimer = window.setTimeout(() => {
            isSaving = false;
            saveCooldownTimer = null;

            classSelect.disabled = allClasses.length === 0;

            addPointButton.textContent = "+ DODAJ BOD";
            addPointButton.disabled =
                !classSelect.value || allClasses.length === 0;

        }, 1000);
    }
});
