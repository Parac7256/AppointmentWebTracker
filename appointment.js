let appointments = [];

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
        el.classList.remove('error-border');
        if (!el.value.trim()) {
            el.classList.add('error-border');
            if (!hasError) { el.focus(); hasError = true; }
        }
    });

    if (hasError) return;

    // 2. 15-Minute Rounding Logic
    let originalDate = new Date(document.getElementById('appointmentTime').value);
    let minutes = originalDate.getMinutes();
    let roundedMinutes = Math.round(minutes / 15) * 15;
    originalDate.setMinutes(roundedMinutes);
    originalDate.setSeconds(0);

    // 3. Create Appointment Object
    const newAppt = {
        name: document.getElementById('clientName').value,
        time: originalDate.toISOString(), 
        id: document.getElementById('clientID').value,
        phone: document.getElementById('phoneNumber').value,
        reason: document.getElementById('callReason').value,
        timestamp: originalDate.getTime()
    };

    // 4. Add and Sort (Soonest to Latest)
    appointments.push(newAppt);
    appointments.sort((a, b) => a.timestamp - b.timestamp);

    renderAppointments();

    // 5. Clear Inputs
    inputIds.forEach(id => document.getElementById(id).value = "");
  
  document.getElementById("SNA").style.display = "none";  // Hides the input form
    document.getElementById("SNA1").style.display = "block"; // Shows the trigger button
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
window.deleteAppointment = function(index) {
    if (confirm("Are you sure you want to cancel this appointment?")) {
        appointments.splice(index, 1);
        renderAppointments();
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
                <button class="cancel-btn" onclick="window.deleteAppointment(${index})">Cancel Appointment</button>
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

//===============SNA++++++++++
window.SNA = function() {
 document.getElementById("SNA1").style.display="none"; document.getElementById("SNA").style.display="block";
}
window.back = function() {
  document.getElementById("SNA").style.display="none";
document.getElementById("SNA1").style.display="block";
}
//====converter=
// 1. Initialize the toggle function immediately
window.toggleConverter = function() {
    const popup = document.getElementById("timeConverter");
    if (!popup) return;
    popup.style.display = (popup.style.display === "none" || popup.style.display === "") ? "block" : "none";
};

// 2. Search Logic for North America
let currentOriginOffset = -5; // Default Eastern Time

window.findLocationTime = function() {
    const query = document.getElementById("citySearch").value.toLowerCase();
    const status = document.getElementById("searchStatus");
    
    // Simple mapping for North American Zones (Daylight Savings 2026)
    if (query.match(/la|pacific|vancouver|seattle|california|nevada|oregon|bc/)) {
        currentOriginOffset = -7;
    } else if (query.match(/denver|mountain|phoenix|arizona|alberta|utah|colorado/)) {
        currentOriginOffset = -6;
    } else if (query.match(/chicago|central|texas|dallas|houston|winnipeg|mexico/)) {
        currentOriginOffset = -5;
    } else if (query.match(/ny|new york|eastern|toronto|florida|miami|dc|quebec/)) {
        currentOriginOffset = -4;
    } else {
        alert("Location not recognized. Defaulting to Eastern Time.");
        currentOriginOffset = -4;
    }
    
    status.innerText = "Zone Set! Adjust local time below.";
    window.updateManilaResult();
};

window.updateManilaResult = function() {
    const timeVal = document.getElementById("inputTime").value;
    if (!timeVal) return;

    const [hours, minutes] = timeVal.split(':').map(Number);
    const diff = 8 - currentOriginOffset;
    let manilaHours = hours + diff;
    
    let dayStatus = "Today";
    if (manilaHours >= 24) { manilaHours -= 24; dayStatus = "Tomorrow"; }
    else if (manilaHours < 0) { manilaHours += 24; dayStatus = "Yesterday"; }
    
    const period = manilaHours >= 12 ? 'PM' : 'AM';
    const displayHours = manilaHours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    
    document.getElementById("manilaResult").innerHTML = 
        `${displayHours}:${displayMinutes} ${period}<br><small style="font-size:11px; color:#2e7d32;">(${dayStatus} in Manila)</small>`;
};