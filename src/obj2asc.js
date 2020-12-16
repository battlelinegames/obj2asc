const chalk = require('chalk');
const fs = require('fs');

var objArray = [];
var matArray = [];
var groupArray = [];

var currentMaterial;
//var currentGroup;
var materialGroupLen = 0;
var startPos = 0;
var currentObj;
var currentObjName;
var group_string = "";
var last_material_end = 0;

function log_error(error_string) {
  console.log(chalk.red.bold(`
    ===================================================================================
    ERROR: ${error_string}
    ===================================================================================
  `));
}

function log_support() {
  console.log(chalk.gray(
    `
  Need help?  
  Contact Rick Battagline
  Twitter: @battagline
  Discord: https://discord.gg/PV6PFC
  https://embed.com/wasm
  `));

}

var VERTEX_ATTRIBUTE_LAYOUT = {
  INTERLEAVE: 0,
  SEPERATE: 1,
  INDEX: 2,
}

var attributeLayout = VERTEX_ATTRIBUTE_LAYOUT.INTERLEAVE;
var includeUV = true;
var array_string = `
export class VertGroup {
  mat_index: i32;
  obj_index: i32;
  start_face: i32;
  length: i32;

  constructor(material_index: i32, object_index: i32, starting_face: i32, len: i32 ) {
    this.mat_index = material_index;
    this.obj_index = object_index;
    this.start_face = starting_face;
    this.length = len;
  }
}

export var objArray = new Array<StaticArray<f32>>(); //AAA
export var matArray = new Array<StaticArray<f32>>(); //BBB
export var groupArray = new Array<VertGroup>(); //CCC
`;

function setFlags(args) {
  for (let i = 3; i < args.length; i++) {
    // VA CHECK
    // -va=interleaved
    // -va=int
    // -va=seperate
    // -va=sep
    // -va=indexed
    // -va=ind
    let va_string = args[i].substring(0, 7);

    switch (va_string) {
      case '-va=int':
        attributeLayout = VERTEX_ATTRIBUTE_LAYOUT.INTERLEAVE;
        break;
      case '-va=sep':
        attributeLayout = VERTEX_ATTRIBUTE_LAYOUT.SEPERATE;
        break;
      case '-va=ind':
        attributeLayout = VERTEX_ATTRIBUTE_LAYOUT.INDEX;
        break;
    }

    if (args[i].substring(0, 5) === "-nouv") {
      includeUV = false;
    }
  }
}

// here
function newMaterial(material_name) {
  console.log('setting current material');
  currentMaterial = {
    id: matArray.length,
    materialName: material_name.replace(/\./g, '_')
  }

  matArray.push(currentMaterial);
}

function specularExponent(Ns) {
  currentMaterial.specularExponent = Ns;
}

function ambientReflectivity(r, g, b) {  // Ka
  currentMaterial.ambientR = {};
  currentMaterial.ambientR.r = r;
  currentMaterial.ambientR.g = g;
  currentMaterial.ambientR.b = b;
}

function diffuseReflectivity(r, g, b) {  // Kd
  currentMaterial.diffuseR = {};
  currentMaterial.diffuseR.r = r;
  currentMaterial.diffuseR.g = g;
  currentMaterial.diffuseR.b = b;
}

function specularReflectivity(r, g, b) {  // Ks
  currentMaterial.specularR = {};
  currentMaterial.specularR.r = r;
  currentMaterial.specularR.g = g;
  currentMaterial.specularR.b = b;
}

function emission(r, g, b) {  // Ke
  currentMaterial.emission = {};
  currentMaterial.emission.r = r;
  currentMaterial.emission.g = g;
  currentMaterial.emission.b = b;
}

function opticalDensity(Ni) {
  currentMaterial.opticalDensity = Ni;
}

function dissolveFactor(d) {
  currentMaterial.dissolveFactor = d;
}

function illuminationModel(illum) {
  currentMaterial.illuminationModel = illum;
}

function parseMatLine(line_string) {
  let tokens = line_string.split(' ');
  switch (tokens[0]) {
    case 'newmtl':
      console.log('newmtl');
      newMaterial(tokens[1]);
      break;
    case 'Ns':
      //console.log('Ns');
      specularExponent(tokens[1]);
      break;
    case 'Ka':
      //console.log('Ka');
      ambientReflectivity(tokens[1], tokens[2], tokens[3]);
      break;
    case 'Kd':
      //console.log('Kd');
      diffuseReflectivity(tokens[1], tokens[2], tokens[3]);
      break;
    case 'Ks':
      //console.log('Ks');
      specularReflectivity(tokens[1], tokens[2], tokens[3]);
      break;
    case 'Ke':
      //console.log('Ke');
      emission(tokens[1], tokens[2], tokens[3]);
      break;
    case 'Ni':
      //console.log('Ni');
      opticalDensity(tokens[1]);
      break;
    case 'd':
      //console.log('d');
      dissolveFactor(tokens[1]);
      break;
    case 'illum':
      //console.log('illum');
      illuminationModel(tokens[1]);
      break;
    default:
  }
}

function parseMaterialFile(material_file) {
  console.log(`OPEN MATERIAL FILE ${material_file}`);
  const bytes = fs.readFileSync(material_file).toString();

  stripComments(bytes);
  const lines = bytes.split('\n');
  for (let i = 0; i < lines.length; i++) {
    parseMatLine(lines[i]);
  }
}

function setCurrentObject(object_name) {
  currentObj = {};
  currentObj.name = currentObjName = object_name;
  currentObj.vertexArray = [];
  currentObj.vertexTextureArray = [];
  currentObj.vertexNormalArray = [];
  currentObj.faceArray = [];

  objArray.push(currentObj);
}

function addVertex(tokens) {
  currentObj.vertexArray.push(
    {
      x: parseFloat(tokens[1]),
      y: parseFloat(tokens[2]),
      z: parseFloat(tokens[3]),
    });
}

function addVertexTextureData(tokens) {
  currentObj.vertexTextureArray.push(
    {
      u: parseFloat(tokens[1]),
      v: parseFloat(tokens[2]),
    });

}

function addVertexNormal(tokens) {
  currentObj.vertexNormalArray.push(
    {
      x: parseFloat(tokens[1]),
      y: parseFloat(tokens[2]),
      z: parseFloat(tokens[3]),
    });
}

// here
function useMaterial(tokens) {
  // THIS SEPARATES THE FACES INTO MULTIPLE MATERIALS
  let current_material_name = tokens[1];

  for (var mat_num = 0; mat_num < matArray.length; mat_num++) {
    if (matArray[mat_num].materialName === current_material_name) {
      break;
    }
  }

  startPos += materialGroupLen;

  console.log(`
  mat_num=${mat_num}
  startPos=${startPos}
  materialGroupLen=${materialGroupLen}
  `);

  if (startPos > 0) {
    group_string = group_string.replace('AAA',
      (materialGroupLen).toString());
    group_string += `
groupArray.push(
  new VertGroup(
    ${mat_num}, // material number
    ${objArray.length - 1}, // object number
    ${startPos}, // starting face
    AAA, // length
  )
);
`;

  }
  else {
    group_string += `
groupArray.push(
  new VertGroup(
    ${mat_num}, // material number
    ${objArray.length - 1}, // object number
    0, // starting face
    AAA, // length
  )
);
`;
  }

  materialGroupLen = 0;
  console.log(`CREATE A GROUP HERE -> ${current_material_name}`);
  for (let i = 0; i < matArray.length; i++) {
    currentMaterial = matArray[i];
    if (current_material_name === currentMaterial.name) {
      break;
    }
  }

  //  currentGroup = {};
  //  currentGroup.object = currentObj.name;
  //  currentGroup.start = currentObj.faceArray.length;

  // group should include
  //currentObj
  //currentObj.faceArray.length;
  // and materialGroupLen (must be added later)
  // DO THIS WHEN YOU FIGURE OUT HOW TO PARSE THE MATERIAL FILE
}

function addFaceIndexes(index_string) {
  let index_array = index_string.split('/');
  return {
    vertex: index_array[0],
    texture: index_array[1],
    normal: index_array[2],
  }
}
// here
function addFace(tokens) {
  face_index_array = [];
  for (let i = 1; i < tokens.length; i++) {
    face_index_array.push(addFaceIndexes(tokens[i]));
    materialGroupLen++; // add one more vertex to the group
  }
  currentObj.faceArray.push(
    face_index_array
  );
}

function stripComments(obj_string) {
  obj_string = obj_string.split('\n').map((line) => {
    line = line.replace(/#.*/, '');
    return line;
  }).join('\n');
  return obj_string;
}

function parseLine(line_string) {
  let tokens = line_string.split(' ');
  switch (tokens[0]) {
    case 'mtllib':
      console.log('mtllib');
      parseMaterialFile(tokens[1]);
      break;
    case 'o':
      //console.log('o');
      setCurrentObject(tokens[1]);
      //currentObjName = tokens[1];
      break;
    case 'v':
      //console.log('v');
      addVertex(tokens);
      break;
    case 'vt':
      //console.log('vt');
      addVertexTextureData(tokens);
      break;
    case 'vn':
      //console.log('vn');
      addVertexNormal(tokens);
      break;
    case 'usemtl':
      //console.log('usemtl');
      useMaterial(tokens);
      break;
    case 'f':
      //console.log('f');
      addFace(tokens);
      break;
    case 's':
      // not sure what s does
      break;
    default:
  }
}

function obj2asc(args) {
  let file_name = args[2];

  if (file_name.indexOf(".") !== -1 &&
    file_name.indexOf(".obj") === -1) {
    log_error(`FILE: ${file_name} must have a .obj extension`);
    return;
  }

  setFlags(args);

  const bytes = fs.readFileSync(file_name).toString();

  stripComments(bytes);
  const lines = bytes.split('\n');
  for (let i = 0; i < lines.length; i++) {
    parseLine(lines[i]);
  }
  var mat_string = "";
  for (let mat_i = 0; mat_i < matArray.length; mat_i++) {
    console.log(`mat_i=${mat_i}`);
    currentMaterial = matArray[mat_i];
    if (currentMaterial != null) {
      let cm = currentMaterial;
      console.log(cm);
      mat_string += `export var ${cm.materialName}_mat:StaticArray<f32> = [
        ${cm.specularExponent}, // specularExponent
        ${cm.ambientR.r}, ${cm.ambientR.g}, ${cm.ambientR.b}, // ambientReflectivity
        ${cm.diffuseR.r}, ${cm.diffuseR.g}, ${cm.diffuseR.b}, // diffuseReflectivity
        ${cm.specularR.r}, ${cm.specularR.g}, ${cm.specularR.b}, // specularReflectivity
        ${cm.emission.r}, ${cm.emission.g}, ${cm.emission.b}, // emission
        ${cm.opticalDensity}, // opticalDensity
        ${cm.dissolveFactor}, // dissolveFactor
        ${cm.illuminationModel}, // illuminationModel
      ];\n\n`;

      mat_string += `matArray.push(${cm.materialName}_mat);\n\n`
    }
    if (attributeLayout === VERTEX_ATTRIBUTE_LAYOUT.INTERLEAVE) {
      let obj_string = "export var ";
      obj_string += `${currentObj.name}_data: StaticArray<f32> =  [\n`;
      if (includeUV) {
        obj_string += `//X,       Y,       Z,       U,       V,       NX,      NY,      NZ\n`;
      }
      else {
        obj_string += `//X,       Y,       Z,       NX,      NY,      NZ\n`;
      }

      for (let i = 0; i < currentObj.faceArray.length; i++) {
        for (let j = 0; j < currentObj.faceArray[i].length; j++) {
          let vertex_index = currentObj.faceArray[i][j].vertex - 1;
          let texture_index = currentObj.faceArray[i][j].texture - 1;
          let normal_index = currentObj.faceArray[i][j].normal - 1;

          let x = currentObj.vertexArray[vertex_index].x.toString().padStart(3, ' ');
          let y = currentObj.vertexArray[vertex_index].y.toString().padStart(7, ' ');
          let z = currentObj.vertexArray[vertex_index].z.toString().padStart(7, ' ');

          let u = currentObj.vertexTextureArray[texture_index].u.toString().padStart(7, ' ');
          let v = currentObj.vertexTextureArray[texture_index].v.toString().padStart(7, ' ');

          let nx = currentObj.vertexNormalArray[normal_index].x.toString().padStart(7, ' ');
          let ny = currentObj.vertexNormalArray[normal_index].y.toString().padStart(7, ' ');
          let nz = currentObj.vertexNormalArray[normal_index].z.toString().padStart(7, ' ');

          if (includeUV) {
            obj_string += `${x}, ${y}, ${z}, ${u}, ${v}, ${nx}, ${ny}, ${nz}, \n`;
          }
          else {
            obj_string += `${x}, ${y}, ${z}, ${nx}, ${ny}, ${nz}, \n`;
          }
        }
      }
      //      currentGroup.length = materialGroupLen;
      //      groupArray.push(currentGroup);
      //      let group_string = `${currentObj.name}_group: StaticArray<f32> =  [\n`;

      // store<f32>(changetype<usize>(color_data) - 8, idof<StaticArray<f32>>());
      /*
      for (let i = 0; i < groupArray.length; i++) {
        currentGroup = groupArray[i];
        group_string += `
      var group_array
      `;
    }
        */

      obj_string += '];\n';
      obj_string += `\nobjArray.push(${currentObj.name}_data);\n`

      console.log('**** write 1 ****');
      array_string = array_string.replace("AAA", objArray.length.toString());
      array_string = array_string.replace("BBB", matArray.length.toString());
      array_string = array_string.replace("CCC", groupArray.length.toString());

      group_string = group_string.replace('AAA', (materialGroupLen).toString());


      fs.writeFile(`${currentObj.name}.asc`,
        array_string + '\n' + mat_string + '\n' +
        obj_string + '\n' + group_string, (err) => {
          if (err) console.log(err);
          console.log(`Successfully wrote to ${currentObj.name}.asc file.`);
        });
    }
    else if (attributeLayout === VERTEX_ATTRIBUTE_LAYOUT.SEPERATE) {
      let obj_string = `export var ${currentObj.name}_posdata: StaticArray<f32> = [\n`;
      obj_string += `//X,       Y,       Z\n`;

      for (let i = 0; i < currentObj.faceArray.length; i++) {
        for (let j = 0; j < currentObj.faceArray[i].length; j++) {
          let vertex_index = currentObj.faceArray[i][j].vertex - 1;

          let x = currentObj.vertexArray[vertex_index].x.toString().padStart(3, ' ');
          let y = currentObj.vertexArray[vertex_index].y.toString().padStart(7, ' ');
          let z = currentObj.vertexArray[vertex_index].z.toString().padStart(7, ' ');

          obj_string += `${x}, ${y}, ${z}, \n`;
        }
      }
      obj_string += '];\n\n';

      if (includeUV) {
        obj_string += `export var ${currentObj.name}_uvdata: StaticArray<f32> =  [\n`;
        obj_string += `//U,       V\n`;
        for (let i = 0; i < currentObj.faceArray.length; i++) {
          for (let j = 0; j < currentObj.faceArray[i].length; j++) {
            let texture_index = currentObj.faceArray[i][j].texture - 1;

            let u = currentObj.vertexTextureArray[texture_index].u.toString().padStart(7, ' ');
            let v = currentObj.vertexTextureArray[texture_index].v.toString().padStart(7, ' ');

            obj_string += `${u}, ${v}, \n`;
          }
        }
        obj_string += '];\n\n';
      }

      obj_string += `export var ${currentObj.name}_normdata: StaticArray<f32> =  [\n`;
      obj_string += `//NX,      NY,      NZ\n`;

      for (let i = 0; i < currentObj.faceArray.length; i++) {
        for (let j = 0; j < currentObj.faceArray[i].length; j++) {
          let normal_index = currentObj.faceArray[i][j].normal - 1;

          let nx = currentObj.vertexNormalArray[normal_index].x.toString().padStart(7, ' ');
          let ny = currentObj.vertexNormalArray[normal_index].y.toString().padStart(7, ' ');
          let nz = currentObj.vertexNormalArray[normal_index].z.toString().padStart(7, ' ');

          obj_string += `${nx}, ${ny}, ${nz}, \n`;
        }
      }

      obj_string += '];\n';
      obj_string += `\nobjArray.push(${currentObj.name}_data);\n`

      array_string = array_string.replace("AAA", objArray.length.toString());
      array_string = array_string.replace("BBB", matArray.length.toString());
      array_string = array_string.replace("CCC", groupArray.length.toString());

      group_string = group_string.replace('AAA', (materialGroupLen).toString());

      console.log('**** write 2 ****');
      fs.writeFile(`${currentObj.name}.asc`,
        array_string + '\n' + mat_string + '\n' +
        obj_string + '\n' + group_string, (err) => {
          if (err) console.log(err);
          console.log(`Successfully wrote to ${currentObj.name}.asc file.`);
        });

    }
    else {
      console.log('**** no write ****');
    }
  }
}

module.exports = { obj2asc, log_support, log_error };