// Turns dist-single/index.html into a body-only page (for hosts that supply their own <html>/<head> skeleton).
import fs from 'fs';
const [src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv.slice(2);
let h = fs.readFileSync(src, 'utf8');
h = h.replace(/<!doctype html>/i, '').replace(/<\/?html[^>]*>/gi, '').replace(/<\/?head>/gi, '').replace(/<\/?body>/gi, '');
h = h.replace(/<meta charset="utf-8"\s*\/?>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
const title = h.match(/<title>.*?<\/title>/)[0];
h = '<title>Nasi Lemak Istimewa</title>\n' + h.replace(title, '');
fs.writeFileSync(out, h.trim() + '\n');
console.log(out, (h.length / 1024).toFixed(0) + ' KB');
