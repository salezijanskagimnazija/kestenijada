
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// TVOJA FIREBASE KONFIGURACIJA
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

// PRIKAZ ZA TV: index.html?rezultati=1
const isDisplayMode =
    new URLSearchParams(window.location.search).get("rezultati") === "1";

let allClasses = [];
let isSaving = false;

// PRIPREMA TV PRIKAZA
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
        loginError.textContent = "Pogrešno korisničko ime ili lozinka.";
    }
});

// PUNJENJE PADAJUĆE LISTE RAZREDA
function renderClassOptions() {
    const selectedClass = classSelect.value;

    classSelect.replaceChildren(
        new Option("-- Odaberi razred --", "")
    );

    // U padajućoj listi razredi su abecedno poredani.
    const sortedClasses = [...allClasses].sort((a, b) =>
        (a.name || a.id).localeCompare(b.name || b.id, "hr")
    );

    sortedClasses.forEach((schoolClass) => {
        const option = new Option(
            schoolClass.name || schoolClass.id,
            schoolClass.id
        );

        classSelect.add(option);
    });

    // Zadrži prethodni odabir nakon osvježavanja podataka.
    if (allClasses.some((item) => item.id === selectedClass)) {
        classSelect.value = selectedClass;
    }

    addPointButton.disabled = !classSelect.value || isSaving;
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

    const sortedClasses = [...allClasses].sort(
        (a, b) => (Number(b.points) || 0) - (Number(a.points) || 0)
    );

    sortedClasses.forEach((schoolClass, index) => {
        const item = document.createElement("li");
        item.className = "leaderboard-item";

        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = index + 1;

        const name = document.createElement("span");
        name.className = "class-name";
        name.textContent = schoolClass.name || schoolClass.id;

        const points = document.createElement("span");
        points.className = "points";

        const totalPoints = Number(schoolClass.points) || 0;
        points.textContent =
            `${totalPoints} ${totalPoints === 1 ? "bod" : "bodova"}`;

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
    }
);

// AKTIVACIJA GUMBA KADA SE ODABERE RAZRED
classSelect.addEventListener("change", () => {
    addPointButton.disabled = !classSelect.value || isSaving;

    if (classSelect.value) {
        statusMessage.textContent =
            "Odabrani razred: " +
            (classSelect.options[classSelect.selectedIndex].text);
    } else {
        statusMessage.textContent = "Odaberi razred za početak.";
    }
});

// DODAVANJE JEDNOG BODA
addPointButton.addEventListener("click", async () => {
    const classId = classSelect.value;

    if (!classId || isSaving) {
        return;
    }

    isSaving = true;
    addPointButton.disabled = true;
    classSelect.disabled = true;

    addPointButton.textContent = "SPREMANJE...";
    statusMessage.textContent = "Spremam bod...";

    try {
        const classRef = doc(db, "classes", classId);

        await updateDoc(classRef, {
            points: increment(1)
        });

        addPointButton.textContent = "✓ BOD DODAN";
        statusMessage.textContent = "Bod je uspješno dodan!";
    } catch (error) {
        console.error("Greška pri dodavanju boda:", error);

        addPointButton.textContent = "GREŠKA";
        statusMessage.textContent =
            "Bod nije spremljen. Provjeri vezu i pokušaj ponovno.";
    } finally {
        // Zaključavanje ostaje još kratko nakon završetka zahtjeva.
        window.setTimeout(() => {
            isSaving = false;
            classSelect.disabled = false;

            addPointButton.textContent = "+ DODAJ BOD";
            addPointButton.disabled = !classSelect.value;
        }, 1000);
    }
});
