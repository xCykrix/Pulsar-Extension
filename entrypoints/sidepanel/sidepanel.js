// Import Material Design Web components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

const API_BASE = 'http://localhost:9000';

let discordLoginBtn;
let userAvatar;
let avatarImg;
let logoutBtn;
let logoutMenu;
let appToast;
let toastTimer;

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
  appToast = document.getElementById('appToast');

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
    discordLoginBtn.disabled = true;

    try {
      await initiateDiscordLogin();
    } catch (error) {
      console.error('Discord login error:', error);
      showToast(getLoginErrorMessage(error), 'error');
    } finally {
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
  const startResponse = await fetchWithTimeout(`${API_BASE}/auth/discord/start`, {}, 8000);
  if (!startResponse.ok) {
    throw new Error('Discord login service is unavailable. Please try again.');
  }

  const startData = await startResponse.json();
  const { sessionId, authUrl } = startData || {};

  if (!sessionId || !authUrl) {
    throw new Error('Discord login service returned an invalid response.');
  }

  // Open Discord auth page in a new tab; API handles the callback
  await chrome.tabs.create({ url: authUrl });

  // Wait 3s before polling.
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Poll API until the user completes auth in the tab
  await new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const maxPollMs = 120000;

    const poll = setInterval(async () => {
      try {
        if (Date.now() - startedAt > maxPollMs) {
          clearInterval(poll);
          reject(new Error('Pulsar Login timed out. Please try again.'));
          return;
        }

        const statusResponse = await fetchWithTimeout(
          `${API_BASE}/auth/discord/status?sessionId=${sessionId}`,
          {},
          8000,
        );

        if (!statusResponse.ok && statusResponse.status !== 404) {
          throw new Error('Unable to reach the Pulsar Login Service. Please try again later or report an issue.');
        }

        const data = await statusResponse.json();

        if (!data || !data.status) {
          clearInterval(poll);
          reject(new Error('Pulsar Login Status was invalid. Please report an issue.'));
          return;
        }

        if (data.status === 'complete') {
          if (!data.user || !data.sessionToken) {
            clearInterval(poll);
            reject(new Error('Pulsar Login successful but session data was invalid. Please report an issue.'));
            return;
          }

          clearInterval(poll);
          await chrome.storage.local.set({ discordUser: data.user, sessionToken: data.sessionToken });
          await checkLoginStatus();
          resolve(data);
        } else if (data.status === 'error') {
          clearInterval(poll);
          reject(new Error(data.error || 'Login Failed. Please try again.'));
        }
        // 'pending' - keep polling
      } catch (error) {
        clearInterval(poll);
        reject(error);
      }
    }, 1500);
  });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Discord login request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getLoginErrorMessage(error) {
  if (error instanceof TypeError) {
    return 'Unable to reach the Pulsar Login Service. Please try again later or report an issue. [2]';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Login Failed. Please try again.';
}

function showToast(message, type = 'info') {
  if (!appToast) {
    return;
  }

  appToast.textContent = message;
  appToast.classList.remove('toast-info', 'toast-error', 'show');
  appToast.classList.add(type === 'error' ? 'toast-error' : 'toast-info');

  requestAnimationFrame(() => {
    appToast.classList.add('show');
  });

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toastTimer = setTimeout(() => {
    appToast.classList.remove('show');
  }, 4200);
}

// Close menu when clicking outside
document.addEventListener('click', () => {
  if (logoutMenu) {
    logoutMenu.classList.remove('show');
  }
});

