function createTexture (gl, sizeX, sizeY) {
  const tex = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  console.log('making texture size', sizeX, sizeY)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    sizeX,
    sizeY,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  )

  return tex
}

const vertex_shader = `
  precision mediump float;
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0, 1.0);
  }
`

const fragment_shader = `
  precision mediump float;
  uniform sampler2D state;

  int get(int x, int y) {
    return int(texture2D(state, (gl_FragCoord.xy + vec2(x, y)) / 1024.0).r);
  }

  void main() {
    int sum = get(-1, -1) +
              get(-1, 0) +
              get(-1, 1) +
              get(0, -1) +
              get(0, 1) +
              get(1, -1) +
              get(1, 0) +
              get(1, 1);

    if (sum == 3) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else if (sum == 2) {
      float current = float(get(0, 0));
      gl_FragColor = vec4(current, current, current, 1.0);
    } else {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      // gl_FragColor = vec4(sum > 4 ? 1.0 : 0.0, sum < 2 ? 1.0 : 0.0, sum == 8 ? 1.0 : 0.0, 1.0);
    }
  }
`

const fragment_shader_copy = `
  uniform sampler2D state;

  void main() {
    gl_FragColor = texture2D(state, gl_FragCoord.xy);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`

function createShader (gl, source, type) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('msg: ' + gl.getShaderInfoLog(shader))
  }

  return shader
}

const components = 2
const verts = [
  -1, -1,
  1, -1,
  -1, 1,
  1, 1
]

function drawQuad (gl, program) {
  const quad = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW)

  const attrib = gl.getAttribLocation(program, 'a_position')

  if (attrib < 0) {
    console.error('failed to get location for position attribute')
    return -1
  }

  gl.vertexAttribPointer(attrib, components, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attrib)

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / components)
}

function drawState (gl, sizeX, sizeY, texture, copyProgram) {
  gl.useProgram(copyProgram)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.viewport(0, 0, sizeX, sizeY)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  
  const state = gl.getUniformLocation(copyProgram, 'state')
  gl.uniform1i(state, 0)
  
  drawQuad(gl, copyProgram)
}

function step (gl, stepBuffer, frontTexture, backTexture, sizeX, sizeY, program) {
  gl.useProgram(program)

  gl.bindFramebuffer(gl.FRAMEBUFFER, stepBuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, backTexture, 0)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, frontTexture)

  gl.viewport(0, 0, sizeX, sizeY)

  const state = gl.getUniformLocation(program, 'state')
  gl.uniform1i(state, 0)

  drawQuad(gl, program)
}

function getRandomCells (sizeX, sizeY) {
  const source = new Uint8Array(sizeX * sizeY * 4)
  for (let i = 0; i < sizeX * sizeY; ++i) {
    let pixi = i * 4
    source[pixi] = source[pixi + 1] = source[pixi + 2] = Math.random() < 0.1 ? 255 : 0
    source[pixi + 3] = 255
  }

  return source
}

function setRandom (gl, texture, sizeX, sizeY) {
  const source = getRandomCells(sizeX, sizeY)

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sizeX, sizeY, gl.RGBA, gl.UNSIGNED_BYTE, source)
}

async function main () {
  const canvas = document.querySelector('#glCanvas')
  const sizeX = canvas.width
  const sizeY = canvas.height

  const gl = canvas.getContext('webgl')

  if (gl === null) {
    console.error('webgl unsupported')
    return
  }

  let frontTexture = createTexture(gl, sizeX, sizeY)
  let backTexture = createTexture(gl, sizeX, sizeY)

  // simulation program
  const program = gl.createProgram()
  gl.attachShader(program, createShader(gl, vertex_shader, gl.VERTEX_SHADER))
  gl.attachShader(program, createShader(gl, fragment_shader, gl.FRAGMENT_SHADER))
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program))
  }

  // copy program for rendering
  const copyProgram = gl.createProgram()
  gl.attachShader(copyProgram, createShader(gl, vertex_shader, gl.VERTEX_SHADER))
  gl.attachShader(copyProgram, createShader(gl, fragment_shader, gl.FRAGMENT_SHADER))
  gl.linkProgram(copyProgram)

  if (!gl.getProgramParameter(copyProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(copyProgram))
  }

  gl.clearColor(0, 0, 0, 1)
  gl.disable(gl.DEPTH_TEST)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  const stepBuffer = gl.createFramebuffer()

  setRandom(gl, frontTexture, sizeX, sizeY)

  let frames = 0
  setInterval(() => {
    document.querySelector('#fps').innerText = frames
    frames = 0
  }, 1000)

  while (true) {
    step(gl, stepBuffer, frontTexture, backTexture, sizeX, sizeY, program)
    const tmp = frontTexture
    frontTexture = backTexture
    backTexture = tmp

    drawState(gl, sizeX, sizeY, frontTexture, copyProgram)
    frames++
    await new Promise(resolve => setTimeout(resolve, 0))
  }
}

window.addEventListener('load', main)
