// Scroll-video sequence settings. Frames are produced by `npm run frames`
// (scripts/extract-frames.sh) from media/nasi-lemak-assembly.mp4.
// `at` = first frame where that step's caption appears (frames counted from 0 in the HD set).
export const sequence = {
  width: 720,
  height: 1280,
  sets: {
    hd: { path: 'frames/hd/', count: 152, step: 1 },   // every frame, 720 px
    lite: { path: 'frames/lite/', count: 76, step: 2 }, // every 2nd frame, 480 px
  },
  ext: 'webp',
  scrollLength: 4.5, // pinned scroll distance, in viewport heights
  steps: [
    { key: 'plate', at: 0 },
    { key: 'rice', at: 6 },
    { key: 'sambal', at: 30 },
    { key: 'egg', at: 54 },
    { key: 'cucumber', at: 66 },
    { key: 'anchovy', at: 88 },
    { key: 'peanut', at: 100 },
    { key: 'chicken', at: 110 },
    { key: 'done', at: 128 },
  ],
};
