// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, limit, deleteDoc, doc, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-storage.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

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
const auth = getAuth(app);

// Connect to Emulators if running locally
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    console.log("Running in development mode: Connecting to Firebase Emulators");
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectAuthEmulator(auth, "http://localhost:9099");
}

document.addEventListener('DOMContentLoaded', () => {
    const card = document.querySelector('.card');
    const container = document.querySelector('.container');

    // Auth UI Elements
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userIcon = document.getElementById('userIcon');
    const userName = document.getElementById('userName');

    // App UI Elements
    const recordBtn = document.getElementById('recordBtn');
    const logsContainer = document.getElementById('logs');

    // Initial State
    if (recordBtn) recordBtn.style.display = 'none'; // Hide by default until logged in

    // --- Authentication Logic ---
    const provider = new GoogleAuthProvider();

    loginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider)
            .then((result) => {
                console.log("Logged in:", result.user);
            }).catch((error) => {
                console.error("Login failed:", error);
                alert("ログインに失敗しました: " + error.message);
            });
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Logged out");
        }).catch((error) => {
            console.error("Logout failed:", error);
        });
    });

    let unsubscribe = null;

    // Monitor Auth State
    onAuthStateChanged(auth, (user) => {
        // Unsubscribe from previous listener if exists
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if (user) {
            // User is signed in.
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userIcon.src = user.photoURL;
            userName.textContent = user.displayName;

            if (recordBtn) recordBtn.style.display = 'block'; // Show record button

            // Query ONLY for this user
            // Note: This requires a composite index on (uid, timestamp).
            const q = query(
                collection(db, "visits"),
                where("uid", "==", user.uid),
                orderBy("timestamp", "desc"),
                limit(10)
            );

            unsubscribe = onSnapshot(q, (snapshot) => {
                currentSnapshot = snapshot;
                renderLogs(snapshot, user);
            }, (error) => {
                console.error("Error fetching logs:", error);
                // If index is missing, it will log a link here.
            });

        } else {
            // No user is signed in.
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';

            if (recordBtn) recordBtn.style.display = 'none'; // Hide record button

            logsContainer.innerHTML = ''; // Clear logs
            currentSnapshot = [];
        }
    });

    // --- Storage Logic ---
    const storageRef = ref(storage, 'robot.png');
    getDownloadURL(storageRef)
        .then((url) => {
            const robotImages = document.querySelectorAll('img[src*="robot.png"]');
            robotImages.forEach(img => {
                img.src = url;
            });
        })
        .catch((error) => {
            console.log("Storage image not found or error:", error);
        });

    // --- 3D Tilt Effect ---
    container.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 25;

        card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;

        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });

    container.addEventListener('mouseenter', () => card.style.transition = 'none');
    container.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });

    // --- Firestore Logic ---
    if (recordBtn) {
        recordBtn.addEventListener('click', async () => {
            if (!auth.currentUser) return; // Guard
            try {
                const now = new Date();
                await addDoc(collection(db, "visits"), {
                    timestamp: now,
                    uid: auth.currentUser.uid,
                    name: auth.currentUser.displayName
                });
            } catch (e) {
                console.error("Error adding document: ", e);
                alert("記録に失敗しました。認証エラーの可能性があります。");
            }
        });
    }

    let currentSnapshot = [];




    function renderLogs(snapshot, currentUser) {
        if (!logsContainer || !snapshot) return;

        logsContainer.innerHTML = '';
        snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();
            const date = data.timestamp.toDate();
            const dateStr = date.toLocaleString();

            const div = document.createElement('div');
            div.className = 'log-item';

            const span = document.createElement('span');
            // Optionally show who visited if available
            // span.textContent = `${dateStr} by ${data.name || 'Anonymous'}`; 
            span.textContent = `Visited at: ${dateStr}`;

            div.appendChild(span);

            // Only show delete button if logged in
            if (currentUser) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.textContent = '×';
                deleteBtn.onclick = async () => {
                    if (confirm('この記録を削除しますか？')) {
                        try {
                            await deleteDoc(doc(db, "visits", snapshotDoc.id));
                        } catch (e) {
                            console.error("Error removing:", e);
                            alert("削除できませんでした（権限がない可能性があります）");
                        }
                    }
                };
                div.appendChild(deleteBtn);
            }

            logsContainer.appendChild(div);
        });
    }
});
