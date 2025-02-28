// Debug script to check JavaScript loading
console.log('Debug app.js loaded');

// Check if key functions exist
window.addEventListener('load', function () {
  console.log('Window load event fired');

  // Check if functions exist
  const functions = [
    'showMyLocation',
    'openPhoneInputModal',
    'closePhoneInputModal',
    'validatePhoneNumber',
    'startLocationSharing',
    'sendLocationToServer',
    'stopLocationSharing',
    'placeUserMarker'
  ];

  functions.forEach(function (funcName) {
    console.log(`Function ${funcName} exists: ${typeof window[funcName] === 'function'}`);
  });

  // Check if HTML elements exist
  const elements = [
    '.location-button',
    '.stop-location-button',
    '#phone-input-modal',
    '#phone-input'
  ];

  elements.forEach(function (selector) {
    const element = document.querySelector(selector);
    console.log(`Element ${selector} exists: ${element !== null}`);
    if (element) {
      console.log(`  display: ${getComputedStyle(element).display}`);
    }
  });

  // Check script loading order
  const scripts = document.querySelectorAll('script');
  console.log('Script loading order:');
  scripts.forEach(function (script, index) {
    console.log(`${index + 1}. ${script.src || 'inline script'}`);
  });
}); 