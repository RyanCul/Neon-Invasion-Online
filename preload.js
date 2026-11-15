const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('SteamAPI', {
  isSteam: true,
  getName: () => ipcRenderer.invoke('steam:getName'),
  getSteamId: () => ipcRenderer.invoke('steam:getSteamId'),
  createLobby: (maxMembers = 8) => ipcRenderer.invoke('steam:createLobby', maxMembers),
  joinLobby: (lobbyId) => ipcRenderer.invoke('steam:joinLobby', lobbyId),
  leaveLobby: () => ipcRenderer.invoke('steam:leaveLobby'),
  openInviteDialog: () => ipcRenderer.invoke('steam:openInviteDialog'),
  sendP2P: (targetSteamId, data) => ipcRenderer.invoke('steam:sendP2P', { targetSteamId, data }),
  setRichPresence: (key, val) => ipcRenderer.invoke('steam:setRichPresence', { key, val }),
  unlockAchievement: (name) => ipcRenderer.invoke('steam:unlockAchievement', name),
  
  // Events from Steam
  onMessage: (callback) => {
    ipcRenderer.on('steam:p2pMessage', (event, data) => callback(data));
  },
  onLobbyJoinRequested: (callback) => {
    ipcRenderer.on('steam:joinRequested', (event, data) => callback(data));
  }
});
