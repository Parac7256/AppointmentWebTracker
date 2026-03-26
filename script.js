import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// Added createUserWithEmailAndPassword, signInWithEmailAndPassword, and signOut below:
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// Add 'orderBy' to this line in your script
import { 
    getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFgm8z5o15HmSqLP3munlHo7vGh_ADBWA",
  authDomain: "appointment-web-70bb5.firebaseapp.com",
  projectId: "appointment-web-70bb5",
  storageBucket: "appointment-web-70bb5.appspot.com",
  messagingSenderId: "620129568290",
  appId: "1:620129568290:web:5518e47512223f7260ec7b"
};
let appointments = [];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// 3. THE BOUNCER: Logic to switch between Login and App
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';

        // This is the part from your photo 5a67ad.jpg
const q = query(
    collection(db, "appointments"), 
    where("userId", "==", user.uid), 
    orderBy("timestamp", "asc") // 'asc' means soonest (smallest number) first
);

        onSnapshot(q, (snapshot) => {
            appointments = snapshot.docs.map(doc => ({ 
              ...doc.data(),  
              id: doc.id 
            }));
          renderAppointments(); 
        });

    } else {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('app-content').style.display = 'none';
    }
});

// 4. GLOBAL FUNCTIONS: For your HTML buttons
window.login = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert(err.message));
};

window.signUp = () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, e, p).then(() => alert("Account Created!")).catch(err => alert(err.message));
};

window.logout = () => signOut(auth);


window.back = function() {
    document.getElementById("SNA").style.display="none";
    document.getElementById("SNA1").style.display="block";
};



window.enableNotifications = function() {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications");
    } else {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                // Send a test immediately to confirm it works
                new Notification("Notifications Enabled!", {
                    body: "You will now receive alerts 8 hours before appointments.",
                    icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png"
                });
            }
        });
    }
};

window.saveAppointment = function() {
    const inputIds = ['clientName', 'appointmentTime', 'clientID', 'phoneNumber', 'callReason'];
    let hasError = false;

    // 1. Validation Logic
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('error-border');
            if (!el.value.trim()) {
                el.classList.add('error-border');
                if (!hasError) el.focus();
                hasError = true;
            }
        }
    });

    if (hasError) return;

    // 2. Create the Data Object
    const appointmentData = {
        name: document.getElementById('clientName').value,
        time: document.getElementById('appointmentTime').value,
        id: document.getElementById('clientID').value,
        phone: document.getElementById('phoneNumber').value,
        reason: document.getElementById('callReason').value,
        userId: auth.currentUser.uid, // <--- This links it to your account  
        timestamp: new Date(document.getElementById('appointmentTime').value).getTime()
    };

    // 3. Send to Firestore (The part that makes it stay on refresh)
    addDoc(collection(db, "appointments"), appointmentData)
        .then(() => {
            // Success! Clear inputs and hide form
            inputIds.forEach(id => document.getElementById(id).value = "");
            document.getElementById("SNA").style.display = "none";
            document.getElementById("SNA1").style.display = "block";
            console.log("Saved to Cloud!");
        })
        .catch((error) => {
            console.error("Error saving:", error);
            alert("Failed to save. Check your internet or login status.");
        });
};

// --- Updated Countdown & Auto-Delete Logic ---
setInterval(() => {
    const now = new Date().getTime();
    let needsReRender = false;

    // We loop backwards to safely remove items from the array while iterating
    for (let i = appointments.length - 1; i >= 0; i--) {
        const appt = appointments[i];
        const distance = appt.timestamp - now;

        // AUTO-DELETE: If time is out (0 or less), remove it
        if (distance <= 0) {
            appointments.splice(i, 1);
            needsReRender = true;
            continue;
        }

        // UPDATE TIMER UI
        const timerElement = document.getElementById(`timer-${i}`);
        if (timerElement) {
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timerElement.innerHTML = `${hours}h ${minutes}m ${seconds}s left`;
        }
    }

    if (needsReRender) {
        renderAppointments();
    }
}, 1000);

// --- MANUAL DELETE FUNCTION ---
// Replace your code from Photo 5974a0.jpg with this:
window.deleteAppointment = async function(id) {
    if (confirm("are you sure you want to delete this appointment?")) return;
        try {
            // 1. Remove it from the Cloud (This makes it stay gone)
            const docRef = doc(db, "appointments", id);
            await deleteDoc(docRef);
            
            console.log("Deleted");
        } catch (error) {
            console.error("Delete failed:", error);
          alert("Error: " + error.message);
        }
};

// 3. RENDER WINDOW FUNCTION: Updated for Relative Dates (Today, Tomorrow, etc.)
window.renderAppointments = function() {
    const list = document.getElementById('appointmentList');
    list.innerHTML = "";
    
    appointments.forEach((appt, index) => {
        const d = new Date(appt.time);
        const now = new Date();
        
        // --- RELATIVE DATE LOGIC ---
        // Reset hours to compare only the calendar days
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        // Calculate the difference in days
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let relativeDateStr = "";
        if (diffDays === 0) {
            relativeDateStr = "Today";
        } else if (diffDays === 1) {
            relativeDateStr = "Tomorrow";
        } else if (diffDays > 1) {
            relativeDateStr = `Next ${diffDays} days`;
        } else {
            // Fallback for word-based date if it's somehow in the past
            relativeDateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        }

        const displayTime = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const li = document.createElement('li');
        li.className = `appointment-item bg-${appt.reason}`;
        
        li.innerHTML = `
            <div class="appt-actions">
                <span class="countdown-timer" id="timer-${index}">...</span>
<button class="cancel-btn" onclick="window.deleteAppointment('${appt.id}')">Cancel Appointment</button>
            </div>
            <div class="appt-info">
                <strong>${relativeDateStr} at ${displayTime}</strong><br>
                👤 ${appt.name} <br>
                ID: <code>${appt.id}</code> 
                <button class="icon-btn" onclick="window.copyText('${appt.id}', this)">📋</button><br>
                📞 ${appt.phone} 
                <button class="icon-btn" onclick="window.copyText('${appt.phone}', this)">📋</button><br>
                📝 <em>Category: ${appt.reason}</em>
            </div>
        `;
        list.appendChild(li);
    });
};

// --- Updated Copy Function with Icon Swap ---
window.copyText = (text, btnElement) => {
    navigator.clipboard.writeText(text);
    const originalIcon = btnElement.innerHTML;
    btnElement.innerHTML = "✅"; // Visual feedback
    setTimeout(() => { btnElement.innerHTML = originalIcon; }, 2000);
};
//=====================================

window.SNA = function() {
    const form = document.getElementById("SNA");
    const triggerBtn = document.getElementById("SNA1");

    // This logic ensures if it's hidden, we show it; if shown, we hide it.
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";    // Show the input form
        triggerBtn.style.display = "none"; // Hide the "Schedule" button
    } else {
        form.style.display = "none";
        triggerBtn.style.display = "block";
    }
};
//==================================================

