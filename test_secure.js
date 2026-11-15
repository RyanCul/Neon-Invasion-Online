const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile(path.join(__dirname, 'game.html'));
  
  win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript('({ isSecureContext: window.isSecureContext, hasGetGamepads: !!navigator.getGamepads })')
      .then(res => {
        console.log('[SECURITY CONTEXT CHECK]:', JSON.stringify(res));
        app.quit();
      });
  });
});
