const packager = require('electron-packager');
const path = require('path');

async function build() {
  console.log('Packaging NeonInvasion into standalone Windows .exe directory...');
  try {
    const appPaths = await packager({
      dir: __dirname,
      name: 'NeonInvasion',
      platform: 'win32',
      arch: 'x64',
      out: path.join(__dirname, 'dist'),
      overwrite: true,
      asar: false, // keep asar false or true; false is great for testing and modding
      ignore: [/dist/]
    });
    console.log('BUILD SUCCESSFUL! Created standalone .exe at:');
    appPaths.forEach(p => console.log(' -> ' + p));
  } catch (err) {
    console.error('Build failed:', err);
  }
}

build();
