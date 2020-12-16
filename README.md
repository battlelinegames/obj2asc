# obj2asc
 Converts a Wavefront .obj file to an AssemblyScript file.  I built this tool to use along side [ASWebGLue](https://github.com/battlelinegames/ASWebGLue), my WebGL bindings for AssemblyScript project.  WebGL does not have any native 3D modeling loaders, so this CLI tool will convert a .obj file into a AssemblyScript .asc file, allowing you to import the model data into a WebGL project in AssemblyScript.  

 ## Questions? 
 Contact me on twitter: @battagline
 Or the AssemblyScript Discord: https://discord.gg/Kz752gWc

## Install:

`npm install obj2asc -g`

## Usage:

`obj2asc somemodel.obj`