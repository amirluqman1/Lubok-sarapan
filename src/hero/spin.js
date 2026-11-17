// "Spinning plate": plays a stacked-alpha MP4 (colour on the top half, alpha mask on the bottom half,
// made by scripts/spin_plate.py) on a transparent WebGL canvas laid over the static plate photo.
// Any failure (no WebGL, video error, autoplay blocked e.g. iPhone low-power mode) → the static
// photo simply stays visible.

const VS = `attribute vec2 p; varying vec2 t;
void main(){ t = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
const FS = `precision mediump float; varying vec2 t; uniform sampler2D v;
void main(){
  vec3 c = texture2D(v, vec2(t.x, t.y * .5)).rgb;
  float a = texture2D(v, vec2(t.x, .5 + t.y * .5)).g;
  a = smoothstep(.03, .97, a);
  gl_FragColor = vec4(c * a, a);
}`;

export function createSpin(host, src) {
  const canvas = document.createElement('canvas');
  canvas.className = 'plate__spin';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;

  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, k, val);
  }

  const video = document.createElement('video');
  Object.assign(video, { muted: true, loop: true, playsInline: true, preload: 'auto' });
  video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
  // H.264 MP4 first (all major browsers); VP9 WebM twin for builds without H.264
  const webm = src.replace(/\.mp4$/, '.webm');
  video.src = !video.canPlayType('video/mp4; codecs="avc1.640028"') && video.canPlayType('video/webm; codecs="vp9"') ? webm : src;

  let want = false, raf = 0, drawn = false;
  const draw = () => {
    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight / 2;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!drawn) { drawn = true; host.classList.add('is-spinning'); }
    }
  };
  const loop = () => {
    if (!want) return;
    draw();
    raf = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop);
  };
  const fail = () => { want = false; host.classList.remove('is-spinning'); };
  video.addEventListener('error', fail);

  host.appendChild(canvas);
  return {
    play() {
      if (want) return;
      want = true;
      video.play().then(loop, fail);
    },
    pause() {
      want = false;
      video.pause();
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(raf); else cancelAnimationFrame(raf);
    },
    /** stop and show the static photo again */
    hide() { this.pause(); drawn = false; host.classList.remove('is-spinning'); },
  };
}
