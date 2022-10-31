/*function createTexture (gl, sizeX, sizeY) {
  const tex = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

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
*/

const vertex_shader = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`

const fragment_shader = `
  void main() {
    gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
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

function main () {
  const canvas = document.querySelector('#glCanvas')
  const sizeX = canvas.width
  const sizeY = canvas.height

  const gl = canvas.getContext('webgl2')

  if (gl === null) {
    console.error('webgl unsupported')
    return
  }

  const program = gl.createProgram()
  gl.attachShader(program, createShader(gl, vertex_shader, gl.VERTEX_SHADER))
  gl.attachShader(program, createShader(gl, fragment_shader, gl.FRAGMENT_SHADER))
  gl.linkProgram(program)
  gl.useProgram(program)

  const components = 3
  const verts = [
    1.0, 1.0, 0,
    -1.0, 1.0, 0,
    -1.0, -1.0, 0,
    -1.0, -1.0, 0,
    1.0, -1.0, 0,
    1.0, 1.0, 0
  ]

  gl.clearColor(0, 0, 0, 1)
  gl.enable(gl.DEPTH_TEST)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.viewport(0, 0, sizeX, sizeY)

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

  gl.drawArrays(gl.TRIANGLES, 0, verts.length / components)
  console.log('drew')
}

window.addEventListener('load', main)
