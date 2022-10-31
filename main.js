import * as THREE from 'https://unpkg.com/three@0.146.0/build/three.module.js';
import { GUI } from 'https://unpkg.com/dat.gui@0.7.9/build/dat.gui.module.js';

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, -20, 10 );
camera.lookAt( 0, 0, 0 );


const scene = new THREE.Scene();

const waveVertexShader = `
    uniform float u_time;
    uniform float x_freq;
    uniform float y_freq;
    uniform float x_speed;
    uniform float y_speed;

    uniform float magnitude;

    varying vec3 vNormal;
    varying vec3 vVertex;

    void main() {
        float z = magnitude * sin(position.x * x_freq + u_time * x_speed) * sin(position.y * y_freq + u_time * y_speed);
        gl_Position = projectionMatrix
        * modelViewMatrix
        * vec4(position.x, position.y, z, 1.0);
        
        vNormal = normalize(vec3(-x_freq * magnitude * cos(x_freq * position.x + u_time * x_speed) * sin(y_freq * position.y + u_time * y_speed), -y_freq * magnitude * sin(x_freq * position.x + + u_time * x_speed) * cos(y_freq * position.y + u_time * y_speed), 1));
        vVertex = position;
        
    }
`;

const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vVertex;

    void main() {
        gl_Position = projectionMatrix
        * modelViewMatrix
        * vec4(position.x, position.y, position.z, 1.0);
        
        vNormal = normalize(vec3(modelMatrix * vec4(normal, 1.0)));
        vVertex = position;
    }
`;

const fragmentShader = `
    uniform vec3 directional_light;
    uniform vec3 view_pos;
    uniform vec3 color;
   
    varying vec3 vNormal;
    varying vec3 vVertex;
    
    void main() {
        vec3 light_dir = normalize(directional_light);
        vec3 view_dir = normalize(view_pos - vVertex);

        vec3 reflect_dir = reflect(-light_dir, vNormal);
        float spec = pow(max(dot(view_dir, reflect_dir), 0.0), 2.0);
        vec3 specular = 0.5 * spec * vec3(1.0, 1.0, 1.0);


        float diffuseFactor = clamp(dot(light_dir, vNormal), 0.0, 1.0);
        vec3 diffuse = diffuseFactor * vec3(1.0, 1.0, 1.0);

        float fresnal = pow(clamp(1. - dot(vNormal, view_dir), 0., 1.), 2.0);
        vec3 rimColor = vec3(1, 1, 1) * fresnal * diffuse;

        vec3 ambient = vec3(0.4, 0.4, 0.4);

        gl_FragColor = vec4(color, 1.0) * vec4(ambient + diffuse + specular, 1.0) + vec4(rimColor, 1);
    }
`;

const light_direction = new THREE.Vector3(-1, -1, 1);

const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20, 100, 100),
    new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0 },
            x_freq: { value: 0.5 },
            y_freq: { value: 0.5 },
            x_speed: { value: 1 },
            y_speed: { value: 1 },
            magnitude: { value: 1 },
            directional_light: { value: light_direction },
            view_pos: { value: camera.position },
            color: { value: new THREE.Vector3(0, 0.4, 0.5) }
        },
        vertexShader: waveVertexShader,
        fragmentShader,
    }),
);

scene.add(plane);

const cube = new THREE.Mesh(
    new THREE.TorusGeometry(2, 1, 8, 20),
    new THREE.ShaderMaterial({
        uniforms: {
            directional_light: { value: light_direction },
            view_pos: { value: camera.position },
            color: { value: new THREE.Vector3(1.0, 0.2, 0.4) }
        },
        vertexShader,
        fragmentShader,
    }),
);

scene.add(cube);

const speed = 0.05;

const gui = new GUI();
const waveShapeFolder = gui.addFolder('Wave Shape');
waveShapeFolder.add(plane.material.uniforms.x_freq, 'value', 0, 1).name('x frequency');
waveShapeFolder.add(plane.material.uniforms.y_freq, 'value', 0, 1).name('y frequency');
waveShapeFolder.add(plane.material.uniforms.magnitude, 'value', 0, 5).name('magnitude');
const speedFolder = gui.addFolder('Speed');
speedFolder.add(plane.material.uniforms.x_speed, 'value', 0, 5).name('x');
speedFolder.add(plane.material.uniforms.y_speed, 'value', 0, 5).name('y');

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
})

let time = 0;

setInterval(() => {
    time += speed;
    plane.material.uniforms.u_time.value = time;

    const normal = new THREE.Vector3(
        -plane.material.uniforms.x_freq.value * plane.material.uniforms.magnitude.value * Math.cos(plane.material.uniforms.x_freq.value * cube.position.x + time * plane.material.uniforms.x_speed.value) * Math.sin(plane.material.uniforms.y_freq.value * cube.position.y + time * plane.material.uniforms.y_speed.value),
        -plane.material.uniforms.y_freq.value * plane.material.uniforms.magnitude.value * Math.sin(plane.material.uniforms.x_freq.value * cube.position.x + time  * plane.material.uniforms.x_speed.value) * Math.cos(plane.material.uniforms.y_freq.value * cube.position.y + time * plane.material.uniforms.y_speed.value),
        1
    ).normalize();

    const upVector = new THREE.Vector3(0, 0, 1);
    const axis = upVector.cross(normal);
    const angle = normal.angleTo(upVector);

    cube.setRotationFromAxisAngle(axis, angle);
    cube.position.z = plane.material.uniforms.magnitude.value * Math.sin(cube.position.x * plane.material.uniforms.x_freq.value + time * plane.material.uniforms.x_speed.value) * Math.sin(cube.position.y * plane.material.uniforms.y_freq.value + time * plane.material.uniforms.y_speed.value);

    renderer.render( scene, camera );
}, 30);
