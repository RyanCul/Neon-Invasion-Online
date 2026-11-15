// Steam Integration & Free P2P Multiplayer Adapter for Neon Invasion
(function() {
  if (!window.SteamAPI) {
    console.log('[Steam] Running in standard browser mode (no Steam desktop wrapper).');
    return;
  }

  console.log('[Steam] Desktop client detected! Initializing Steamworks...');

  // Auto-populate player name with Steam Persona
  window.SteamAPI.getName().then(steamName => {
    if (steamName) {
      const nameBox = document.getElementById('name');
      if (nameBox) {
        nameBox.value = steamName.toUpperCase().slice(0, 12);
        try { localStorage.setItem('ni_name', nameBox.value); } catch(e) {}
      }
    }
  });

  // Steam Guest Socket (implements the WebSocket interface expected by startOnline)
  function makeSteamGuestSocket(hostSteamId) {
    const s = {
      readyState: 1, // WebSocket.OPEN
      send: function(msg) {
        window.SteamAPI.sendP2P(hostSteamId, msg);
      },
      close: function() {
        s.readyState = 3;
        window.SteamAPI.leaveLobby();
        if (s.onclose) s.onclose();
      },
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null
    };

    window.SteamAPI.onMessage(function(ev) {
      if (ev.senderId === hostSteamId) {
        if (s.onmessage) s.onmessage({ data: ev.data });
      }
    });

    setTimeout(function() {
      if (s.onopen) s.onopen();
    }, 50);

    return s;
  }

  // Steam Host Adapter (connects incoming Steam P2P peers to HostRoom)
  function attachSteamToHostRoom(hostRoom) {
    const peerHandlers = new Map();

    window.SteamAPI.onMessage(function(ev) {
      const senderId = ev.senderId;
      let hnd = peerHandlers.get(senderId);
      if (!hnd) {
        const fakeConn = {
          send: function(payload) {
            window.SteamAPI.sendP2P(senderId, payload);
          },
          close: function() {
            peerHandlers.delete(senderId);
          }
        };
        hnd = hostRoom.attach(fakeConn);
        peerHandlers.set(senderId, hnd);
      }
      hnd(ev.data);
    });
  }

  window.SteamNet = {
    makeSteamGuestSocket: makeSteamGuestSocket,
    attachSteamToHostRoom: attachSteamToHostRoom
  };

  // Add Steam Invite Button to online panel
  window.addEventListener('DOMContentLoaded', function() {
    const onlineCard = document.querySelector('.mc.on');
    if (onlineCard) {
      const inviteBtn = document.createElement('button');
      inviteBtn.id = 'bSteamInvite';
      inviteBtn.className = 'c';
      inviteBtn.style.marginTop = '6px';
      inviteBtn.style.display = 'none';
      inviteBtn.textContent = 'INVITE STEAM FRIENDS';
      inviteBtn.onclick = function() {
        window.SteamAPI.openInviteDialog();
      };
      onlineCard.appendChild(inviteBtn);
    }
  });

  // Listen for invite accept clicks from Steam friend chats or overlay
  window.SteamAPI.onLobbyJoinRequested(async function(data) {
    console.log('[Steam] Accepted invite to lobby:', data.lobbyId);
    const res = await window.SteamAPI.joinLobby(data.lobbyId);
    if (res.ok && res.hostSteamId) {
      const name = (document.getElementById('name').value.trim() || 'PLAYER').toUpperCase();
      // Connect to host via Steam P2P socket
      if (typeof startOnline === 'function') {
        startOnline('steam://' + data.lobbyId, 'STEAM', name, function() {
          return makeSteamGuestSocket(res.hostSteamId);
        });
      }
    }
  });

})();
