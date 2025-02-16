// ----------------------
// CONFIGURATION
// ----------------------

// The GTFS-RT feed endpoint for South East Queensland from TransLink.
const FEED_URL = "https://translink.com.au/about-translink/open-data/gtfs-rt"; 
// Set your target stop ID for Northshore Hamilton.
// (Replace with the actual stop ID as provided in your static GTFS data.)
const TARGET_STOP_ID = "NORTHSHORE_HAMILTON";

// ----------------------
// HELPER FUNCTIONS
// ----------------------

// Convert Unix timestamp (in seconds) to a local time string.
function formatTime(unixSeconds) {
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Create a list item element for a departure.
function createDepartureItem(departure) {
  const li = document.createElement("li");
  li.className = "list-group-item";
  li.textContent = `${departure.route} → ${departure.destination} at ${departure.departureTime}`;
  return li;
}

// ----------------------
// MAIN FUNCTION
// ----------------------

// Load the GTFS-RT proto file and then fetch and decode the feed.
function loadAndProcessFeed() {
  // Load the proto file from the local file 'gtfs-realtime.proto'
  protobuf.load("gtfs-realtime.proto", function(err, root) {
    if (err) {
      console.error("Error loading proto:", err);
      document.getElementById("error-message").classList.remove("d-none");
      return;
    }
    // Obtain the FeedMessage type
    const FeedMessage = root.lookupType("transit_realtime.FeedMessage");
    
    // Fetch the binary feed
    fetch(FEED_URL)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(buffer => {
        const feed = FeedMessage.decode(new Uint8Array(buffer));
        processFeed(feed);
      })
      .catch(error => {
        console.error("Error fetching feed:", error);
        document.getElementById("error-message").classList.remove("d-none");
      });
  });
}

// Process the decoded feed: filter for the target stop and separate CityCat and Bus departures.
function processFeed(feed) {
  const citycatDepartures = [];
  const busDepartures = [];
  
  // Iterate over each entity in the feed.
  feed.entity.forEach(entity => {
    if (entity.trip_update) {
      const trip = entity.trip_update.trip;
      const routeId = trip.route_id || "";
      // Iterate through each stop_time_update.
      entity.trip_update.stop_time_update.forEach(stu => {
        if (stu.stop_id === TARGET_STOP_ID) {
          // Use departure time if available; otherwise use arrival time.
          const timeEvent = stu.departure || stu.arrival;
          if (timeEvent && timeEvent.time) {
            const departureTime = formatTime(timeEvent.time);
            const departureObj = {
              route: routeId,
              destination: "TBD", // In a full implementation, you would map trip data to a destination name.
              departureTime: departureTime,
              timestamp: timeEvent.time
            };
            // Categorize based on assumed route ID prefixes.
            if (routeId.startsWith("CC")) {
              citycatDepartures.push(departureObj);
            } else if (routeId.startsWith("B")) {
              busDepartures.push(departureObj);
            }
          }
        }
      });
    }
  });

  // Sort departures by timestamp.
  citycatDepartures.sort((a, b) => a.timestamp - b.timestamp);
  busDepartures.sort((a, b) => a.timestamp - b.timestamp);

  // Render results.
  renderDepartures("citycat-list", "citycat-loading", citycatDepartures);
  renderDepartures("bus-list", "bus-loading", busDepartures);
}

// Render up to 5 departures in the specified list element.
function renderDepartures(listId, loadingId, departures) {
  const listEl = document.getElementById(listId);
  listEl.innerHTML = ""; // Clear loading message.
  if (departures.length === 0) {
    listEl.innerHTML = `<li class="list-group-item text-center">No departures available</li>`;
    return;
  }
  departures.slice(0, 5).forEach(dep => {
    listEl.appendChild(createDepartureItem(dep));
  });
}

// Initialize when the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  loadAndProcessFeed();
});
