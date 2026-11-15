const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Steam overlay and Gamepad compatibility flags for Chromium / WebGL on Windows
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');
// Force XInput / DirectInput fallback so all Xbox, PlayStation, and generic PC gamepads work reliably
app.commandLine.appendSwitch('disable-features', 'WindowsGamingInput');

let steamClient = null;
let currentLobbyId = null;
let mainWindow = null;

// Initialize Steamworks (480 is Valve's official Spacewar developer test AppID)
try {
  const steamworks = require('steamworks.js');
  // Look for steam_appid.txt or default to 480
  let appId = 480;
  const appIdPath = path.join(__dirname, 'steam_appid.txt');
  if (fs.existsSync(appIdPath)) {
    appId = parseInt(fs.readFileSync(appIdPath, 'utf8').trim()) || 480;
  }
  steamClient = steamworks.init(appId);
  console.log(`[Steam] Initialized with AppID ${appId} for player: ${steamClient.localplayer.getName()} (${steamClient.localplayer.getSteamId().steamId64})`);
} catch (err) {
  console.warn('[Steam] Could not initialize Steamworks (is Steam client running?):', err.message);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0418',
    title: 'Neon Invasion',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false // Keep multiplayer active when window loses focus
    }
  });

  mainWindow.loadFile('game.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.focus();
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    if (level >= 2) console.warn('[PAGE WARN/ERR]', message, 'at line', line);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup Steam Callbacks & P2P polling if Steam is active
  if (steamClient) {
    setupSteamIntegration();
  }
}

function setupSteamIntegration() {
  // Rich presence initial
  try {
    steamClient.friends.setRichPresence('status', 'In Main Menu');
  } catch (e) {}

  // Lobby Join from Steam overlay / Friends list
  try {
    steamClient.callback.register('GameLobbyJoinRequested', (data) => {
      console.log('[Steam] Lobby join requested:', data);
      if (mainWindow && data.steamIDLobby) {
        mainWindow.webContents.send('steam:joinRequested', { lobbyId: data.steamIDLobby.toString() });
      }
    });
  } catch (e) {}

  // P2P Incoming Packet Polling Loop (every 15ms)
  setInterval(() => {
    if (!steamClient || !mainWindow) return;
    try {
      while (steamClient.networking.isP2PPacketAvailable(0)) {
        const size = steamClient.networking.isP2PPacketAvailable(0);
        const buf = Buffer.alloc(size);
        const res = steamClient.networking.readP2PPacket(buf, 0);
        if (res) {
          const senderId = res.steamId.steamId64 ? res.steamId.steamId64.toString() : res.steamId.toString();
          const strData = buf.toString('utf8');
          mainWindow.webContents.send('steam:p2pMessage', { senderId, data: strData });
        }
      }
    } catch (e) {
      // networking polling tick
    }
  }, 15);
}

// IPC Handlers
ipcMain.handle('steam:getName', () => {
  return steamClient ? steamClient.localplayer.getName() : 'Player';
});

ipcMain.handle('steam:getSteamId', () => {
  return steamClient ? steamClient.localplayer.getSteamId().steamId64.toString() : null;
});

ipcMain.handle('steam:createLobby', async (event, maxMembers) => {
  if (!steamClient) return { ok: false, error: 'Steam not running' };
  try {
    const lobbyId = await steamClient.matchmaking.createLobby(steamClient.matchmaking.LobbyType.FriendsOnly, maxMembers);
    currentLobbyId = lobbyId;
    steamClient.matchmaking.setLobbyData(lobbyId, 'name', `${steamClient.localplayer.getName()}'s Neon Game`);
    steamClient.friends.setRichPresence('status', 'Hosting Neon Invasion');
    console.log('[Steam] Created Lobby:', lobbyId.toString());
    return { ok: true, lobbyId: lobbyId.toString() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('steam:joinLobby', async (event, lobbyIdStr) => {
  if (!steamClient) return { ok: false, error: 'Steam not running' };
  try {
    const lobbyId = BigInt(lobbyIdStr);
    currentLobbyId = lobbyId;
    await steamClient.matchmaking.joinLobby(lobbyId);
    const hostSteamId = steamClient.matchmaking.getLobbyOwner(lobbyId);
    steamClient.friends.setRichPresence('status', 'Fighting Aliens with Friends');
    return { ok: true, hostSteamId: hostSteamId.steamId64 ? hostSteamId.steamId64.toString() : hostSteamId.toString() };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('steam:leaveLobby', () => {
  if (steamClient && currentLobbyId) {
    try {
      steamClient.matchmaking.leaveLobby(currentLobbyId);
    } catch (e) {}
    currentLobbyId = null;
  }
  return true;
});

ipcMain.handle('steam:openInviteDialog', () => {
  if (steamClient && currentLobbyId) {
    try {
      steamClient.friends.activateGameOverlayInviteDialog(currentLobbyId);
      return true;
    } catch (e) {}
  }
  return false;
});

ipcMain.handle('steam:sendP2P', (event, { targetSteamId, data }) => {
  if (!steamClient) return false;
  try {
    const target = BigInt(targetSteamId);
    const buf = Buffer.from(data, 'utf8');
    return steamClient.networking.sendP2PPacket(target, 2 /* Reliable */, buf, 0);
  } catch (e) {
    console.error('[Steam P2P send error]:', e);
    return false;
  }
});

ipcMain.handle('steam:setRichPresence', (event, { key, val }) => {
  if (steamClient) {
    try { steamClient.friends.setRichPresence(key, val); } catch (e) {}
  }
  return true;
});

ipcMain.handle('steam:unlockAchievement', (event, name) => {
  if (steamClient) {
    try {
      steamClient.achievement.activate(name);
      return true;
    } catch (e) {}
  }
  return false;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
