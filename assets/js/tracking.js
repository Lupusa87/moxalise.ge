// Location tracking functionality

// Reference to user location marker
let userLocationMarker = null;
let locationUpdateInterval = null;
let lastPhoneNumber = null;

// Initialize location tracking on page load
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOMContentLoaded event fired in tracking.js');

  // Check if we have a phone number saved
  const savedPhone = localStorage.getItem('lastPhoneNumber');
  const lastLocation = localStorage.getItem('lastSentLocation');

  console.log('Last phone number from localStorage:', savedPhone);
  console.log('Last location from localStorage:', lastLocation ? 'exists' : 'not found');

  if (savedPhone && lastLocation) {
    lastPhoneNumber = savedPhone;

    // Restart the location sharing interval
    if (locationUpdateInterval) {
      clearInterval(locationUpdateInterval);
    }

    locationUpdateInterval = setInterval(sendLocationToServer, 5 * 60 * 1000); // 5 minutes

    // Show the stop button
    const stopButton = document.querySelector('.stop-location-button');
    if (stopButton) {
      console.log('Found stop button, setting display to flex');
      stopButton.style.display = 'flex';
    } else {
      console.error('Stop location button not found in the DOM!');
    }

    // Place marker on the map if data exists
    try {
      const locationData = JSON.parse(lastLocation);
      if (locationData.latitude && locationData.longitude) {
        console.log('Placing marker from saved location:', locationData.latitude, locationData.longitude);

        // Create marker element
        const el = document.createElement('div');
        el.className = 'user-location-marker';

        // Add the marker to the map once it's loaded
        if (typeof map !== 'undefined') {
          console.log('Map is defined, placing marker now');
          placeUserMarker(locationData.latitude, locationData.longitude);
        } else {
          console.log('Map is not defined yet, adding event listener for map_initialized');
          // Wait for map to be initialized
          window.addEventListener('map_initialized', function () {
            console.log('map_initialized event fired, placing marker now');
            placeUserMarker(locationData.latitude, locationData.longitude);
          });
        }
      }
    } catch (error) {
      console.error('Error parsing last location:', error);
    }
  } else {
    console.log('No saved phone number or location found, skipping location sharing initialization');
  }
});

/**
 * Places the user location marker on the map
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
function placeUserMarker(lat, lng) {
  // If we already have a marker, remove it
  if (userLocationMarker) {
    userLocationMarker.remove();
  }

  // Create marker element
  const el = document.createElement('div');
  el.className = 'user-location-marker';

  // Add the marker to the map
  userLocationMarker = new maplibregl.Marker({
    element: el,
    anchor: 'center',
  })
    .setLngLat([lng, lat])
    .addTo(map);
}

/**
 * Opens the phone number input dialog without immediately requesting location
 */
function showMyLocation() {
  console.log('showMyLocation function called from tracking.js');

  // Skip directly to opening the phone modal
  console.log('Opening phone input modal first');
  if (typeof openPhoneInputModal === 'function') {
    openPhoneInputModal();
  } else {
    console.error('openPhoneInputModal function not found!');
    alert('Error: Could not open phone input form. Please refresh the page and try again.');
  }
}

/**
 * Validates a Georgian mobile phone number
 * @param {string} phoneNumber - The phone number to validate
 * @return {boolean} Whether the phone number is valid
 */
function validatePhoneNumber(phoneNumber) {
  // Must be 9 digits and start with 5
  const regex = /^5\d{8}$/;
  return regex.test(phoneNumber);
}

/**
 * Starts sharing location after the user has entered their phone number
 * This now handles the actual location request
 */
function startLocationSharing() {
  console.log('startLocationSharing called');

  const phoneInput = document.getElementById('phone-input');
  if (!phoneInput) {
    console.error('phone-input element not found!');
    alert('Error: Could not find phone input field. Please refresh the page and try again.');
    return;
  }

  const phoneNumber = phoneInput.value.trim();

  if (!validatePhoneNumber(phoneNumber)) {
    alert('გთხოვთ შეიყვანოთ სწორი მობილურის ნომერი, რომელიც იწყება 5-ით და შედგება 9 ციფრისგან');
    return;
  }

  // Save phone number to local storage and variable
  localStorage.setItem('lastPhoneNumber', phoneNumber);
  lastPhoneNumber = phoneNumber;

  // Close the modal
  if (typeof closePhoneInputModal === 'function') {
    closePhoneInputModal();
  } else {
    console.error('closePhoneInputModal function not found!');
    // Try direct DOM manipulation as fallback
    const modal = document.getElementById('phone-input-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Show loading indication
  const button = document.querySelector('.location-button');
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'იძებნება...';
    button.disabled = true;

    // Request location permissions and get current position
    if ('geolocation' in navigator) {
      console.log('Requesting geolocation permission');

      navigator.geolocation.getCurrentPosition(
        function (position) {
          console.log('Geolocation success:', position.coords);
          // Success callback - got the position
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          try {
            // Place marker on the map
            placeUserMarker(userLat, userLng);

            // Fly to the user's location
            map.flyTo({
              center: [userLng, userLat],
              zoom: Math.min(13, MAX_ZOOM_LEVEL), // Limit zoom to max 17.3
              duration: 1500,
            });

            // Send location immediately to the server
            sendLocationToServer();

            // Set up interval to send location every 5 minutes
            if (locationUpdateInterval) {
              clearInterval(locationUpdateInterval);
            }

            locationUpdateInterval = setInterval(sendLocationToServer, 5 * 60 * 1000); // 5 minutes

            // Show the stop button
            const stopButton = document.querySelector('.stop-location-button');
            if (stopButton) {
              stopButton.style.display = 'flex';
            } else {
              console.error('stop-location-button not found in the DOM!');
            }

            // Show feedback to user
            alert('თქვენი ლოკაცია წარმატებით გაზიარდა და გაგრძელდება ყოველ 5 წუთში ერთხელ');

          } catch (e) {
            console.error('Error displaying map location:', e);
            alert('Error displaying your location on the map. Please try again.');
          }

          // Reset button state
          button.textContent = originalText;
          button.disabled = false;
        },
        function (error) {
          // Error callback
          console.error('Error getting location:', error);
          let errorMessage = 'ლოკაციის მოძიება ვერ მოხერხდა';

          // More specific error messages
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'გთხოვთ დართოთ ლოკაციაზე წვდომის უფლება';
          }

          alert(errorMessage);

          // Reset button state
          button.textContent = originalText;
          button.disabled = false;
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      // Geolocation not supported by the browser
      console.error('Geolocation is not supported by this browser');
      alert('თქვენი ბრაუზერი არ უჭერს მხარს გეოლოკაციას');

      // Reset button state
      button.textContent = originalText;
      button.disabled = false;
    }
  } else {
    console.error('Location button not found for visual feedback');

    // Even if button isn't found, still try to get location
    requestAndShareLocation();
  }
}

/**
 * Helper function to request and share location
 */
function requestAndShareLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        try {
          // Place marker on the map
          placeUserMarker(userLat, userLng);

          // Fly to the user's location
          map.flyTo({
            center: [userLng, userLat],
            zoom: Math.min(13, MAX_ZOOM_LEVEL),
            duration: 1500,
          });

          // Send location immediately to the server
          sendLocationToServer();

          // Set up interval to send location every 5 minutes
          if (locationUpdateInterval) {
            clearInterval(locationUpdateInterval);
          }

          locationUpdateInterval = setInterval(sendLocationToServer, 5 * 60 * 1000);

          // Show the stop button
          const stopButton = document.querySelector('.stop-location-button');
          if (stopButton) {
            stopButton.style.display = 'flex';
          }

          // Show feedback to user
          alert('თქვენი ლოკაცია წარმატებით გაზიარდა და გაგრძელდება ყოველ 5 წუთში ერთხელ');
        } catch (e) {
          console.error('Error in location handling:', e);
        }
      },
      function (error) {
        console.error('Error getting location:', error);
        let errorMessage = 'ლოკაციის მოძიება ვერ მოხერხდა';
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = 'გთხოვთ დართოთ ლოკაციაზე წვდომის უფლება';
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    alert('თქვენი ბრაუზერი არ უჭერს მხარს გეოლოკაციას');
  }
}

/**
 * Sends the current location to the server
 */
function sendLocationToServer() {
  console.log('Attempting to send location to server');

  if (!lastPhoneNumber) {
    console.error('Phone number not available');
    return;
  }

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        console.log('Got current position for server update:',
          position.coords.latitude.toFixed(6),
          position.coords.longitude.toFixed(6));

        // Create the payload
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          altitude: position.coords.altitude || 0,
          altitude_accuracy: position.coords.altitudeAccuracy || 0,
          heading: position.coords.heading || 0,
          speed: position.coords.speed || 0,
          phone_number: lastPhoneNumber,
          message: "Location update"
        };

        // Save to local storage
        localStorage.setItem('lastSentLocation', JSON.stringify(payload));
        console.log('Saved location to localStorage');

        // Send to server
        console.log('Sending location to API...');
        fetch('https://moxalise-api-vk3ygvyuia-ey.a.run.app/api/location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })
          .then(response => {
            console.log('API response status:', response.status);
            if (!response.ok) {
              throw new Error('Network response was not ok: ' + response.status);
            }
            return response.json();
          })
          .then(data => {
            console.log('Location sent successfully:', data);
            // Update the marker on successful send if needed
            try {
              placeUserMarker(position.coords.latitude, position.coords.longitude);
            } catch (e) {
              console.error('Could not update marker:', e);
            }
          })
          .catch(error => {
            console.error('Error sending location:', error);
            // Don't stop sending future updates on error
          });
      },
      function (error) {
        console.error('Error getting location for server update:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  } else {
    console.error('Geolocation is not supported for server updates');
  }
}

/**
 * Stops sharing location
 */
function stopLocationSharing() {
  console.log('stopLocationSharing called');

  if (locationUpdateInterval) {
    console.log('Clearing location update interval');
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;

    // Hide the stop button
    const stopButton = document.querySelector('.stop-location-button');
    if (stopButton) {
      stopButton.style.display = 'none';
    } else {
      console.error('stop-location-button not found when trying to hide it');
    }

    alert('ლოკაციის გაზიარება შეჩერებულია');
  } else {
    console.log('No active location sharing to stop');
  }
} 