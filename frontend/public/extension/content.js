// Detect if the user is on a coding/problem-solving webpage
const isCodingPage = /github\.com|leetcode\.com|stackoverflow\.com|hackerrank\.com|codepen\.io/i.test(window.location.hostname);

// Create the floating NeuroMentor orb
const orb = document.createElement("div");
orb.id = "neuromentor-extension-orb";
orb.title = "Ask NeuroMentor Socratic Hint";

// Create inner SVG icon
orb.innerHTML = `
  <svg viewBox="0 0 16 16" width="24" height="24" fill="none" style="filter: drop-shadow(0 0 4px rgba(255,255,255,0.25));">
    <circle cx="8" cy="5" r="1.6" fill="#ffffff" />
    <circle cx="4.5" cy="12" r="1.2" fill="#ffffff" />
    <circle cx="11.5" cy="12" r="1.2" fill="#ffffff" />
    <line x1="8" y1="5" x2="4.5" y2="12" stroke="#ffffff" stroke-width="0.9" />
    <line x1="8" y1="5" x2="11.5" y2="12" stroke="#ffffff" stroke-width="0.9" />
  </svg>
`;

// Add classes depending on the page
if (isCodingPage) {
  orb.classList.add("pulse-active");
  
  // Inject a temporary guiding tip
  const tip = document.createElement("div");
  tip.id = "neuromentor-extension-tip";
  tip.innerHTML = `
    <div style="font-weight: 700; color: #60a5fa; margin-bottom: 2px;">Need a Socratic Hint?</div>
    <div style="font-size: 9px; color: rgba(255,255,255,0.7);">Click to open learning assistant</div>
  `;
  document.body.appendChild(tip);
  
  // Fade out tip after 5 seconds
  setTimeout(() => {
    tip.style.opacity = "0";
    setTimeout(() => tip.remove(), 500);
  }, 5000);
}

// Click listener to toggle the side panel
orb.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "open_sidepanel" }, (response) => {
    console.log("Sidepanel open command status:", response);
  });
});

document.body.appendChild(orb);
