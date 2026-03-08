# Tasks for Other Agent — SunnySip

## Goal
Make the app look clean and polished like Google Maps. Real streets visible, light theme, floating panel over the map.

---

## Task 1 — Switch to a light map style with real streets
Change the Mapbox style to streets-v12 so the map shows real street names, shop labels, and points of interest — just like Google Maps looks. The current dark style hides all of that.

Street names must always be readable underneath the 3D buildings and markers. The buildings should be semi-transparent so the street names and labels beneath them stay visible. Think of how Google Maps shows buildings as light beige shapes but you can still clearly read the street names through them. The 3D buildings are a nice visual touch but they should never block the map underneath.

## Task 2 — Make the map fill the full screen
Right now the map and sidebar sit side by side. Instead, the map should fill the entire screen and the panel should float on top of it in the top-left corner, like how Google Maps works. The map should always be visible behind everything.

## Task 3 — Light theme for the floating panel
Replace the dark sidebar with a clean white panel. White background, dark gray text, subtle shadow underneath. No dark colors anywhere in the UI.

## Task 4 — Redesign the terrace list items
Each item in the list should look like a Google Maps search result: a colored circle icon on the left, the name and type in the middle, and a small "Zon" or "Schaduw" label on the right. Clean rows, no colored borders around each item.

## Task 5 — Replace emoji markers with proper map pins
The markers on the map should look like real map pins — the teardrop shape you see on Google Maps — not just floating emoji. Sunny terraces get a yellow pin, shady ones get a gray pin.

## Task 6 — Split the list into two sections
Show sunny terraces first under a "In de zon" heading, then shady ones under "In de schaduw". Add a thin line between the two sections. This makes it immediately clear which terraces are worth visiting.

## Task 7 — Show a friendly message when no terraces are found
If the list is empty (still loading or nothing nearby), show a centered message with a small icon saying something like "Geen terrassen gevonden — beweeg de kaart om meer te laden." No blank white space.

## Task 8 — Move the zoom buttons to the bottom-right
The Mapbox zoom and compass controls should sit in the bottom-right corner of the map, far away from the floating panel so they don't overlap.

## Task 9 — Add a "go to my location" button
A small round white button floating on the map (bottom-right, above the zoom controls) with a location pin icon. Clicking it flies the map to the user's current GPS location.

## Task 10 — Polish the popups
When you click a marker, the popup should look like a clean info card — rounded corners, the terrace name in bold, a colored sun/shade badge, and the type underneath. No default browser-style tooltip look.

## Task 11 — Show a loading bar instead of a spinner text
When data is loading, show a thin animated colored bar at the top of the panel (like the one you see in Chrome when a page loads). Remove the "⏳ Laden..." text.

## Task 12 — Add a distance or "outdoor seating" indicator in the list
For terraces that have confirmed outdoor seating in the data, show a small "🪑 Buiten zitten" tag in the list item. This helps users quickly spot proper terraces vs restaurants that just happen to be nearby.

## Task 13 — Make the sun info more compact
The current sun stats (altitude, direction, sunrise, sunset) take up a lot of space. Combine them into one slim horizontal bar with small labels, tucked just below the time picker. Less visual weight, more space for the terrace list.

## Task 14 — Smooth fly animation when clicking a terrace
When a user clicks a terrace in the list, the map should smoothly fly to it and open its popup automatically. Right now it flies there but doesn't open the popup.

## Task 15 — Adjust the map pitch and bearing for a nicer default view
Start the map at a slight tilt (around 40–50 degrees pitch) so the 3D buildings look good from the start. The buildings should be visible but not so extreme that street names become hard to read.

---

## Task 16 — URGENT: Make street names visible under the 3D buildings
This is the most important fix. Right now the 3D building layer is added on top of everything, including the street name labels — so the labels get buried underneath the buildings and become invisible.

The fix: when adding the 3D buildings layer to the map, insert it *before* the first symbol layer in the map style. Symbol layers are what Mapbox uses to draw street names and labels. By inserting the buildings before those layers, the labels will render on top of the buildings and stay readable.

In App.jsx, inside the map 'load' event, before calling addLayer for the 3D buildings, find the first symbol layer in the current map style like this: loop through map.current.getStyle().layers and find the first one where type === 'symbol'. Then pass its id as the second argument to addLayer. This tells Mapbox to insert the buildings layer just below that symbol layer, so all text labels always draw on top.

This one change will make street names, place names, and all other labels visible again even in areas with buildings.

## Task 17 — Fix the rotated emoji inside the map pins
The pin shape is rotated -45 degrees to get the teardrop look, but the emoji inside rotates along with it and ends up appearing tilted on the map. The emoji should always be perfectly upright. Fix this by counter-rotating the emoji inside the pin by +45 degrees so it stays straight regardless of the pin rotation.

## Task 17 — Remove duplicate terraces from the list
The data from OpenStreetMap sometimes returns the same cafe or bar twice — once because it has outdoor seating, and once just because it's a cafe nearby. Before showing the list, filter out any duplicates that share the same ID so each terrace appears only once.

## Task 18 — Show an error message if data loading fails
Right now if the internet connection drops or OpenStreetMap is slow, the app just silently fails and shows an empty list. Instead, show a small friendly message in the panel like "Kon geen data laden — probeer opnieuw" with a retry button that reloads the data for the current map position.

## Task 19 — Fix the section label border on first item
The "In de zon" section label currently has a top border applied via CSS, but it also shows that border when it's the very first thing in the list (before anything else), which looks odd. Make sure the first section label never shows a border above it.

## Task 20 — Make the panel look good on smaller screens
On a laptop with a smaller screen the panel takes up too much vertical space and the terrace list barely has room to scroll. Make the sun info bar slightly more compact on shorter screens so the list always gets enough space to show at least 4–5 terraces at once.

## Task 21 — Highlight the selected terrace in the list
When a user clicks a terrace in the list and the map flies to it, that terrace item should stay visually highlighted (slightly different background) so the user knows which one is currently selected. Clicking another one moves the highlight.

## Task 22 — Show sunrise time next to sunset in the sun bar
Currently only sunset time is shown. Add sunrise time too so the user can immediately see how much daylight is left. Keep it compact — both in the same sun bar row.

## Task 23 — Mapbox logo and attribution should not overlap the panel
On some screen sizes the Mapbox logo in the bottom-left corner sits right behind or too close to the floating panel. Make sure there's always enough horizontal space between the panel's right edge and the logo so nothing overlaps.

## Task 24 — Smooth transition when the list reloads
When the map moves and new terrace data loads in, the list items currently pop in instantly. Add a subtle fade-in animation so new items appear smoothly rather than jumping into place.

## Task 25 — Make the "Nu" button show the current time correctly
The "Nu" button resets the time input to the current moment, but it uses the local system time converted to ISO format which can sometimes show UTC instead of local time depending on the browser. Make sure clicking "Nu" always sets the time to the correct local time that matches what the user sees on their clock.

---

## Cybersecurity

## Task 27 — Beveilig de Mapbox token met een URL-beperking
De Mapbox token staat in de frontend code en is daardoor zichtbaar voor iedereen die de browser devtools opent. Iemand kan die token kopiëren en gebruiken op hun eigen project, op jouw kosten. Ga naar mapbox.com, open de token instellingen, en beperk de token tot alleen de URL van de live site (bv. sunnysip.vercel.app). Zo werkt de token nergens anders.

## Task 28 — Zorg dat het .env bestand nooit op GitHub komt
Het .env bestand bevat de geheime Mapbox token. Controleer of .env in het .gitignore bestand staat. Als dat niet zo is, voeg het toe. Controleer ook of de token niet per ongeluk al in een vorige commit zit — als dat zo is, moet de token onmiddellijk vernieuwd worden op mapbox.com want een gepubliceerde token is gecompromitteerd.

## Task 29 — Bescherm tegen XSS in de popup
De popup op de kaart wordt opgebouwd met directe HTML, inclusief de terrassenaam uit OpenStreetMap. Als een terrassenaam speciale tekens bevat zoals < of > of een script-tag, kan dat onverwacht gedrag veroorzaken in de browser. Zorg dat alle tekst die van buiten komt (naam, type) eerst door een escape-functie gaat voordat het in de popup HTML wordt gezet. Zo kan kwaadaardige tekst nooit als echte HTML worden uitgevoerd.

## Task 30 — Beperk hoe vaak de API opgeroepen wordt
Elke keer dat de gebruiker de kaart beweegt, stuurt de app een verzoek naar OpenStreetMap. Als iemand de kaart snel heen en weer sleept, worden er tientallen verzoeken tegelijk verstuurd. Voeg een vertraging in van bijvoorbeeld 1 seconde: wacht tot de kaart stilstaat voordat het verzoek verstuurd wordt. Dit beschermt zowel de OpenStreetMap servers als de eigen app tegen overbelasting.

## Task 31 — Dwing HTTPS af
De live site mag nooit bereikbaar zijn via onbeveiligd HTTP. Vercel doet dit automatisch, maar controleer na het deployen dat de URL altijd met https:// begint en dat HTTP-bezoeken automatisch doorgestuurd worden naar HTTPS. Zo worden gegevens tussen de browser en de server altijd versleuteld.

## Task 32 — Controleer de dependencies op bekende kwetsbaarheden
Voer npm audit uit in de projectmap. Dit toont een lijst van npm-pakketten die bekende beveiligingsproblemen hebben. Los alle "high" en "critical" meldingen op door de betrokken pakketten bij te werken. Dit is een standaard stap voor elk project dat online gezet wordt.

---

## Task 26 — LAST STEP: Deploy the app for free via Vercel

Deploy SunnySip online for free using Vercel. This is the easiest option for a Vite/React app and takes about 5 minutes.

Steps:
1. Make sure the code is pushed to a GitHub repository (create one if needed)
2. Go to vercel.com and sign in with GitHub
3. Click "Add New Project" and import the sunnysip repository
4. Vercel will automatically detect it's a Vite project — no build settings need to change
5. Before deploying, add the environment variable: name is VITE_MAPBOX_TOKEN, value is the Mapbox token from the local .env file
6. Click Deploy — Vercel gives a free public URL like sunnysip.vercel.app

Important: the Mapbox token must be added as an environment variable in the Vercel project settings, otherwise the map won't load on the live site. Never commit the .env file to GitHub.

After deploying, every time code is pushed to GitHub, Vercel automatically rebuilds and updates the live site for free.

---

## Notes
- Tasks 1–15 are mostly done already — focus on task 16 first (street names), then 17–25, then 26 last
- Do not change any of the logic — sun calculations, shadow detection, data fetching all stay the same
- Only change how things look and where things are on screen
- Task 16 (street names hidden) is the most urgent visual bug right now
- Task 26 (deployment) is always the very last step, after everything looks good
