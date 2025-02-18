// Translink open data endpoint – no API key required
const GTFS_RT_FEED_URL = 'https://gtfsrt.api.translink.com.au/seq/tripupdates';
// Using a free CORS proxy to bypass browser restrictions
const PROXY_URL = 'https://thingproxy.freeboard.io/fetch/';

document.addEventListener('DOMContentLoaded', function() {
  // Load the GTFS Realtime proto file
  protobuf.load("gtfs-realtime.proto", function(err, root) {
    if (err) {
      console.error("Error loading proto file:", err);
      return;
    }
    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");
    
    function updateTimestamp() {
      const now = new Date();
      document.getElementById('timestamp').textContent = 
        now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function updateDepartures() {
      const fetchUrl = PROXY_URL + GTFS_RT_FEED_URL;
      console.log("Fetching data from:", fetchUrl);
      fetch(fetchUrl)
        .then(response => {
          console.log("Response received:", response);
          if (!response.ok) {
            throw new Error("Network response was not ok. Status: " + response.status);
          }
          return response.arrayBuffer();
        })
        .then(buffer => {
          console.log("Fetched buffer length:", buffer.byteLength);
          if (buffer.byteLength === 0) {
            throw new Error("Empty response buffer received.");
          }
          let message;
          try {
            message = FeedMessage.decode(new Uint8Array(buffer));
            console.log("Decoded GTFS Realtime message:", message);
          } catch (decodeError) {
            console.error("Error decoding GTFS Realtime data:", decodeError);
            throw decodeError;
          }
          const departuresContainer = document.querySelector('.departures');
          departuresContainer.innerHTML = "";
          const now = Date.now();
          let departures = [];
          
          // Process each feed entity
          message.entity.forEach(entity => {
            if (entity.trip_update) {
              const trip = entity.trip_update.trip;
              const route = trip.route_id || "Unknown";
              
              if (entity.trip_update.stop_time_update && entity.trip_update.stop_time_update.length > 0) {
                entity.trip_update.stop_time_update.forEach(update => {
                  if (update.departure_time) {
                    const departureTimeMs = update.departure_time * 1000;
                    if (departureTimeMs > now) {
                      departures.push({
                        route: route,
                        stop: update.stop_id,
                        departureTime: departureTimeMs
                      });
                    }
                  }
                });
              }
            }
          });
          
          departures.sort((a, b) => a.departureTime - b.departureTime);
          
          if (departures.length === 0) {
            departuresContainer.innerHTML = "<p>No upcoming departures at the moment.</p>";
          } else {
            departures.slice(0, 5).forEach(dep => {
              const minutes = Math.round((dep.departureTime - now) / 60000);
              const card = document.createElement('div');
              card.className = "departure-card";
              card.innerHTML = `
                <div class="route-number">${dep.route}</div>
                <div>
                  <div class="destination">Stop: ${dep.stop}</div>
                </div>
                <div class="time">${minutes} min</div>
              `;
              departuresContainer.appendChild(card);
            });
          }
          updateTimestamp();
        })
        .catch(err => {
          console.error("Error fetching or processing GTFS realtime data:", err);
          document.querySelector('.departures').innerHTML = "<p>Error loading departures data.</p>";
        });
    }

    // Initial load
    updateDepartures();
    // Refresh departures every 30 seconds
    setInterval(updateDepartures, 30000);
  });
});
