// Translink API configuration
const CONFIG = {
    API_KEY: 'YOUR_API_KEY', // Get this from translink.com.au
    FERRY_STOP_ID: '3026', // Northshore Hamilton CityCat
    BUS_STOP_ID: '317474', // Northshore Hamilton bus stop
    MAX_RESULTS: 5,
    UPDATE_INTERVAL: 60 // Seconds
};

async function fetchDepartures(stopId, routeType) {
    const url = `https://api.translink.com.au/rtt/publicapi/stop/${stopId}?routeType=${routeType}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${CONFIG.API_KEY}` }
        });
        const data = await response.json();
        return data.services
            .sort((a, b) => new Date(a.nextDepart) - new Date(b.nextDepart))
            .slice(0, CONFIG.MAX_RESULTS);
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
}

function displayTimes(containerId, services) {
    const container = document.getElementById(containerId);
    container.innerHTML = services.length 
        ? services.map(service => `
            <div class="time-item">
                ${service.routeNumber}<br>
                ${new Date(service.nextDepart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        `).join('')
        : '<div class="time-item">No services</div>';
}

async function updateDepartures() {
    const [ferries, buses] = await Promise.all([
        fetchDepartures(CONFIG.FERRY_STOP_ID, 'Ferry'),
        fetchDepartures(CONFIG.BUS_STOP_ID, 'Bus')
    ]);

    displayTimes('ferry-times', ferries);
    displayTimes('bus-times', buses);
    document.getElementById('update-time').textContent = new Date().toLocaleTimeString();
}

// Initial load and periodic updates
updateDepartures();
setInterval(updateDepartures, CONFIG.UPDATE_INTERVAL * 1000);
