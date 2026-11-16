// Scroll-video choreography. Frames come from `npm run frames` (scripts/extract-frames.sh).
// Each chapter gets an equal-ish share of scroll (its `weight`), regardless of how many video
// frames it spans, so every caption has time to be read.
// focus = point (0–1 of the video frame) the camera pushes in on; zoom = scale at the peak.
export const sequence = {
  width: 720,
  height: 1280,
  sets: {
    hd: { path: 'frames/hd/', count: 152, step: 1 },
    lite: { path: 'frames/lite/', count: 76, step: 2 },
  },
  ext: 'webp',
  vhPerUnit: 0.62, // scroll distance (viewport heights) per timeline unit
  intro: { weight: 1 },
  chapters: [
    { key: 'rice', from: 0, to: 28, weight: 1.3, focus: [0.56, 0.5], zoom: 1.08, ghost: 'NASI', title: 'Nasi santan', line: 'Ditanak bersama santan dan daun pandan.', notes: ['Wangi', 'Lemak', 'Gebu'] },
    { key: 'sambal', from: 28, to: 54, weight: 1.5, focus: [0.74, 0.56], zoom: 1.16, ghost: 'SAMBAL', title: 'Sambal', line: 'Ditumis perlahan sehingga pecah minyak.', notes: ['Pedas', 'Manis', 'Berkilat'] },
    { key: 'egg', from: 54, to: 66, weight: 1, focus: [0.36, 0.6], zoom: 1.14, ghost: 'TELUR', title: 'Telur rebus', line: 'Dibelah dua, kuningnya keemasan.', notes: ['Lembut', 'Segar'] },
    { key: 'cucumber', from: 66, to: 88, weight: 1.1, focus: [0.76, 0.46], zoom: 1.14, ghost: 'TIMUN', title: 'Timun', line: 'Sejuk dan rangup — pengimbang pedas sambal.', notes: ['Segar', 'Rangup'] },
    { key: 'anchovy', from: 88, to: 100, weight: 1, focus: [0.3, 0.52], zoom: 1.14, ghost: 'BILIS', title: 'Ikan bilis', line: 'Digoreng garing hingga keemasan.', notes: ['Garing', 'Masin'] },
    { key: 'peanut', from: 100, to: 110, weight: 1, focus: [0.82, 0.52], zoom: 1.14, ghost: 'KACANG', title: 'Kacang tanah', line: 'Kacang goreng berkulit, rangup.', notes: ['Rangup', 'Lemak'] },
    { key: 'chicken', from: 110, to: 132, weight: 1.3, focus: [0.42, 0.44], zoom: 1.1, ghost: 'AYAM', title: 'Ayam goreng', line: 'Diperap rempah, digoreng hingga kulitnya rangup.', notes: ['Berempah', 'Rangup'] },
  ],
  finale: { from: 132, to: 151, weight: 1.8 },
};
