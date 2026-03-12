// Import Material Design Web components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

const API_BASE = 'http://localhost:8000';

let discordLoginBtn;
let userAvatar;
let avatarImg;
let logoutBtn;
let logoutMenu;

// Initialize on load
async function init() {
  // Wait for Material Design components to be ready
  try {
    await customElements.whenDefined('md-filled-button');
  } catch (e) {
    console.log('Material Design components loading...');
  }

  // Get references to DOM elements
  discordLoginBtn = document.getElementById('discordLoginBtn');
  userAvatar = document.getElementById('userAvatar');
  avatarImg = document.getElementById('avatarImg');
  logoutBtn = document.getElementById('logoutBtn');
  logoutMenu = document.getElementById('logoutMenu');

  // Verify elements exist
  if (!discordLoginBtn) {
    console.error('Discord login button not found');
    return;
  }

  console.log('Discord button found, attaching listeners');

  // Add event listeners
  discordLoginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      discordLoginBtn.disabled = true;
      await initiateDiscordLogin();
    } catch (error) {
      console.error('Discord login error:', error);
      discordLoginBtn.disabled = false;
    }
  });

  if (userAvatar) {
    userAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (logoutMenu) {
        logoutMenu.classList.toggle('show');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await chrome.storage.local.remove(['discordUser', 'sessionToken']);
      if (logoutMenu) {
        logoutMenu.classList.remove('show');
      }
      showLoggedOutState();
    });
  }

  await checkLoginStatus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function checkLoginStatus() {
  const data = await chrome.storage.local.get(['discordUser']);

  if (data.discordUser) {
    showLoggedInState(data.discordUser);
  } else {
    showLoggedOutState();
  }
}

function showLoggedInState(user) {
  if (discordLoginBtn) {
    discordLoginBtn.style.display = 'none';
  }
  if (userAvatar) {
    userAvatar.style.display = 'flex';
  }

  if (user.avatar && avatarImg) {
    // Discord avatar URL format
    const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    avatarImg.src = avatarUrl;
    avatarImg.alt = `${user.username}'s avatar`;
  }
}

function showLoggedOutState() {
  if (discordLoginBtn) {
    discordLoginBtn.style.display = 'block';
  }
  if (userAvatar) {
    userAvatar.style.display = 'none';
  }
}

async function initiateDiscordLogin() {
  // Ask API to generate a session and the Discord auth URL
  const startResponse = await fetch(`${API_BASE}/auth/discord/start`);
  if (!startResponse.ok) {
    throw new Error('Failed to start Discord login');
  }

  const { sessionId, authUrl } = await startResponse.json();

  // Open Discord auth page in a new tab; API handles the callback
  await chrome.tabs.create({ url: authUrl });

  // Poll API until the user completes auth in the tab
  await new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      try {
        const statusResponse = await fetch(`${API_BASE}/auth/discord/status?sessionId=${sessionId}`);
        const data = await statusResponse.json();

        if (data.status === 'complete') {
          clearInterval(poll);
          await chrome.storage.local.set({ discordUser: data.user, sessionToken: data.sessionToken });
          await checkLoginStatus();
          if (discordLoginBtn) discordLoginBtn.disabled = false;
          resolve(data);
        } else if (data.status === 'error') {
          clearInterval(poll);
          reject(new Error(data.error || 'Login failed'));
        }
        // 'pending' — keep polling
      } catch (error) {
        clearInterval(poll);
        reject(error);
      }
    }, 1500);
  });
}

// Close menu when clicking outside
document.addEventListener('click', () => {
  if (logoutMenu) {
    logoutMenu.classList.remove('show');
  }
});

