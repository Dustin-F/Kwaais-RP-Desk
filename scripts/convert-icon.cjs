const fs = require('fs');
const path = require('path');

async function main() {
  const pngToIco = (await import('png-to-ico')).default;
  const pngPath = path.join(__dirname, '..', 'icon.png');
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
  // build/ is gitignored, so it doesn't exist on a fresh checkout (CI)
  fs.mkdirSync(path.dirname(icoPath), { recursive: true });
  const buf = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, buf);
  console.log('Created', icoPath, '(' + buf.length, 'bytes)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
