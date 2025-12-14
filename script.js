
// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";

// Firebase Configuration
const firebaseConfig = {
    projectId: "test-app1-2a73e",
    appId: "1:760466678448:web:52a5764221d015b85d5175",
    storageBucket: "test-app1-2a73e.firebasestorage.app",
    apiKey: "AIzaSyA8ZWw5vzk45f4M54j7RzCydbsedvEwea4",
    authDomain: "test-app1-2a73e.firebaseapp.com",
    messagingSenderId: "760466678448",
    projectNumber: "760466678448"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to Emulators if running locally
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("Running in development mode: Connecting to Firebase Emulators");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
}

document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.card');
    const container = document.querySelector('.container');
    const recordBtn = document.getElementById('recordBtn');
    const logsContainer = document.getElementById('logs');
    const robotImg = document.querySelector('.robot');

    // Fetch Image from Storage
    // Fetch Image from Storage
    const storageRef = ref(storage, 'robot.png');
    // Attempt to get download URL. If it fails (not uploaded yet), fall back to local or keep default.
    getDownloadURL(storageRef)
        .then((url) => {
            // Find all images that should be the robot and update their source.
            // This covers both the header icon and the animation robot.
            const robotImages = document.querySelectorAll('img[src*="robot.png"]');
            robotImages.forEach(img => {
                img.src = url;
            });
        })
        .catch((error) => {
            console.log("Could not fetch image from Storage (might not be uploaded yet):", error);
            // Fallback to local if desired, but user manually set src in HTML to ./img/robot.png
        });

    // 3D Tilt Effect
    container.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;

        card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;

        // Update mouse position for spotlight effect
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });

    container.addEventListener('mouseenter', (e) => {
        card.style.transition = 'none';
    });

    container.addEventListener('mouseleave', (e) => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });

    // FireStore Logic
    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            try {
                const now = new Date();
                await addDoc(collection(db, "visits"), {
                    timestamp: now
                });
                console.log("Document written");
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("記録に失敗しました。コンソールを確認してください。");
            }
        });
    }

    // Real-time listener
    const q = query(collection(db, "visits"), orderBy("timestamp", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        logsContainer.innerHTML = ''; // Clear current
        snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();
            const date = data.timestamp.toDate();
            const dateStr = date.toLocaleString();

            const div = document.createElement('div');
            div.className = 'log-item';

            const span = document.createElement('span');
            span.textContent = `Visited at: ${dateStr}`;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = async () => {
                const confirmDelete = confirm('この記録を削除しますか？');
                if (confirmDelete) {
                    try {
                        await deleteDoc(doc(db, "visits", snapshotDoc.id));
                        console.log("Document deleted");
                    } catch (e) {
                        console.error("Error removing document: ", e);
                        alert("削除に失敗しました");
                    }
                }
            };

            div.appendChild(span);
            div.appendChild(deleteBtn);
            logsContainer.appendChild(div);
        });
    });
});
