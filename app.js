// app.js
const STOP_IDS = {
    FERRY: '3026',    // Northshore Hamilton CityCat
    BUS: '317474'     // Northshore Hamilton Bus
};

async function fetchGTFSFeed() {
    try {
        const response = await fetch('https://gtfsrt.api.translink.com.au/feed/SEQ/TripUpdates');
        const buffer = await response.arrayBuffer();
        return transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
    } catch (error) {
        console.error('Error fetching GTFS feed:', error);
        return null;
    }
}

function processDepartures(feed, stopId) {
    const departures = [];
    
    feed.entity.forEach(entity => {
        if (entity.trip_update) {
            const tripUpdate = entity.trip_update;
            tripUpdate.stop_time_update.forEach(update => {
                if (update.stop_id === stopId && update.departure) {
                    const departureTime = update.departure.time;
                    if (departureTime > Math.floor(Date.now() / 1000)) { // Only future departures
                        departures.push({
                            route: tripUpdate.trip.route_id,
                            time: departureTime
                        });
                    }
                }
            });
        }
    });

    // Sort and get next 5
    return departures.sort((a, b) => a.time - b.time)
                     .slice(0, 5)
                     .map(d => ({
                         route: d.route.replace('F', 'CityCat '), // Convert ferry route IDs
                         time: new Date(d.time * 1000)
                     }));
}

async function updateDepartures() {
    const feed = await fetchGTFSFeed();
    if (!feed) return;

    const ferryData = processDepartures(feed, STOP_IDS.FERRY);
    const busData = processDepartures(feed, STOP_IDS.BUS);

    displayTimes('ferry-times', ferryData);
    displayTimes('bus-times', busData);
    document.getElementById('update-time').textContent = new Date().toLocaleTimeString();
}

// Previous JS code remains the same, just update the displayTimes function:

function displayTimes(containerId, departures) {
    const container = document.getElementById(containerId);
    container.innerHTML = departures.length > 0 
        ? departures.map(d => `
            <div class="time-item">
                <span class="route-number">${d.route}</span>
                <span class="departure-time">
                    ${d.time.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                    }).replace(':', '')}
                </span>
            </div>
        `).join('')
        : `<div class="time-item">
             <span class="route-number">--</span>
             <span class="departure-time">----</span>
           </div>`;
}

// Initial load and refresh every 30 seconds
updateDepartures();
setInterval(updateDepartures, 30000);
