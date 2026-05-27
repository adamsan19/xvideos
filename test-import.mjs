import xvideos from './dist/esm/index.js';

console.log('imported default:', typeof xvideos);
if (xvideos && typeof xvideos === 'object') {
  console.log('top-level keys:', Object.keys(xvideos));
  if (xvideos.videos) {
    console.log('videos keys:', Object.keys(xvideos.videos));
  }
}
