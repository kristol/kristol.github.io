// List of party places, initially with some known ones
let places = [
    { name: "Instant-Fogas", lat: 47.5022, lng: 19.0621 },
    { name: "Akvárium Klub", lat: 47.4979, lng: 19.0556 },
    { name: "Szimpla Kert", lat: 47.4972, lng: 19.0624 },
    { name: "Pontoon", lat: 47.4987, lng: 19.0457 },
    { name: "Toldi Klub", lat: 47.5042, lng: 19.0586 },
    { name: "Fröccsterasz", lat: 47.4978, lng: 19.0552 },
    { name: "Lärm", lat: 47.4976, lng: 19.0622 },
    { name: "Barba Negra", lat: 47.4637, lng: 19.0487 },
    { name: "Dürer Kert", lat: 47.5071, lng: 19.0772 },
    { name: "A38 Hajó", lat: 47.4816, lng: 19.0507 }
];

// Fetch party places from OpenStreetMap Overpass API
function fetchOSMPartyPlaces() {
    // Query for clubs, bars, pubs, and music venues in Budapest
    const query = `
        [out:json][timeout:25];
        (
          node["amenity"~"nightclub|bar|pub|music_venue"](47.41,19.02,47.56,19.15);
          way["amenity"~"nightclub|bar|pub|music_venue"](47.41,19.02,47.56,19.15);
          relation["amenity"~"nightclub|bar|pub|music_venue"](47.41,19.02,47.56,19.15);
        );
        out center;
    `;
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        headers: {
            'Content-Type': 'text/plain'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.elements) {
            const newPlaces = data.elements.map(el => {
                let lat = el.lat || (el.center && el.center.lat);
                let lng = el.lon || (el.center && el.center.lon);
                let name = el.tags && el.tags.name ? el.tags.name : null;
                if (lat && lng && name) {
                    return { name, lat, lng };
                }
                return null;
            }).filter(Boolean);
            // Add only unique places by name
            const existingNames = new Set(places.map(p => p.name));
            newPlaces.forEach(p => {
                if (!existingNames.has(p.name)) {
                    places.push(p);
                }
            });
        }
    })
    .catch(err => console.error('OSM fetch error:', err));
}

let map;
let marker;

function initMap() {
    map = L.map('map').setView([47.4979, 19.0402], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

function showPlace(place) {
    const placeDiv = document.getElementById('place');
    placeDiv.innerHTML = `<span class="flashy">${place.name}</span>`;
    // Add Google Maps direction button
    const directionBtn = document.createElement('button');
    directionBtn.textContent = 'Útvonal ide';
    directionBtn.className = 'direction-btn shake';
    directionBtn.onclick = function() {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
        window.open(url, '_blank');
    };
    // Remove previous button if exists
    const oldBtn = document.querySelector('.direction-btn');
    if (oldBtn) oldBtn.remove();
    placeDiv.appendChild(directionBtn);
    // More confetti bursts for extra effect
    for (let i = 0; i < 3; i++) {
        setTimeout(() => launchConfetti(), i * 350);
    }
    if (marker) {
        map.removeLayer(marker);
    }
    map.setView([place.lat, place.lng], 15);
    marker = L.marker([place.lat, place.lng]).addTo(map)
        .bindPopup(`<b>${place.name}</b>`)
        .openPopup();
}

// Confetti animation
function launchConfetti() {
    const colors = ['#ff00cc', '#333399', '#00ff99', '#ffb400', '#ff4c4c', '#00bfff'];
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    for (let i = 0; i < 32; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.top = (Math.random() * 20) + 'vh';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = (Math.random() * 0.7) + 's';
        confetti.appendChild(piece);
    }
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 2000);
}

window.onload = function() {
    initMap();
    fetchOSMPartyPlaces();

    // Quiz logic: step-by-step
    const quizForm = document.getElementById('partyQuiz');
    const genBtn = document.getElementById('generateBtn');
    if (quizForm) {
        if (genBtn) genBtn.style.display = 'none';
        const q1 = document.getElementById('q1');
        const q2 = document.getElementById('q2');
        const q3 = document.getElementById('q3');
        const quizSubmit = document.getElementById('quizSubmit');
        let answers = [null, null, null];

        // Helper to show next question
        function showNextQuestion(idx) {
            if (idx === 1) {
                q2.style.display = 'block';
                q2.classList.remove('animated');
                void q2.offsetWidth; // trigger reflow
                q2.classList.add('animated');
            }
            if (idx === 2) {
                q3.style.display = 'block';
                q3.classList.remove('animated');
                void q3.offsetWidth;
                q3.classList.add('animated');
            }
            if (idx === 3) quizSubmit.style.display = 'inline-block';
        }

        // Listen for q1 answer
        Array.from(q1.querySelectorAll('input[type="radio"]')).forEach(radio => {
            radio.onclick = function() {
                answers[0] = radio.value;
                showNextQuestion(1);
            };
        });
        // Listen for q2 answer
        Array.from(q2.querySelectorAll('input[type="radio"]')).forEach(radio => {
            radio.onclick = function() {
                answers[1] = radio.value;
                showNextQuestion(2);
            };
        });
        // Listen for q3 answer
        Array.from(q3.querySelectorAll('input[type="radio"]')).forEach(radio => {
            radio.onclick = function() {
                answers[2] = radio.value;
                showNextQuestion(3);
            };
        });

        quizSubmit.onclick = function() {
            if (answers.some(a => !a)) {
                alert('Válaszolj minden kérdésre!');
                return;
            }
            let score = 0;
            answers.forEach(a => {
                if (a === 'party') score += 1;
                else if (a === 'hardcore') score += 2;
            });
            // Use OSM tags for filtering
            let filtered;
            if (score <= 1) {
                // Chill: bars, pubs, music_venue (not nightclub)
                filtered = places.filter(p => p.tags && (
                    p.tags.amenity === 'bar' ||
                    p.tags.amenity === 'pub' ||
                    p.tags.amenity === 'music_venue') &&
                    p.tags.amenity !== 'nightclub'
                );
            } else if (score <= 3) {
                // Party: nightclub, music_venue
                filtered = places.filter(p => p.tags && (
                    p.tags.amenity === 'nightclub' ||
                    p.tags.amenity === 'music_venue')
                );
            } else {
                // Hardcore: only nightclubs
                filtered = places.filter(p => p.tags && p.tags.amenity === 'nightclub');
            }
            if (!filtered.length) filtered = places;
            const randomPlace = filtered[Math.floor(Math.random() * filtered.length)];
            showPlace(randomPlace);
        };
    } else if (genBtn) {
        genBtn.onclick = function() {
            const randomPlace = places[Math.floor(Math.random() * places.length)];
            showPlace(randomPlace);
        };
    }
}
