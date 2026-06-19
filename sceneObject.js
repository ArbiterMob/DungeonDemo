"use strict";
import * as Utils  from "./utils.js"

export class SceneObject
{
    //#region PROPERTIES

    #bufferInfo;
    #modelMatrix;

    #position;

    #mesh = 
    {
        sourceMesh: null
    }

    objectData = 
    {
        mesh: null,

        positions: [],
        normals: [],
        texcoords: [],
        tangents: [],

        texture: null,

        numVertices: 0,
        ambient: 0,
        diffuse: 0,
        specular: 0,
        emissive: 0,
        shininess: 0,
        opacity: 1,

        mapKd: null,
        mapBump: null,
        mapNs: null,
        mapRefl: null,
    }

    #texture;
    #normalMap;
    #roughnessMap;
    #metalnessMap;

    isDead = false;

    waypoints = [];
    currentWaypointIndex = 0;
    isPatrolling = false;

    currentFacingAngle = 0.0;
    startFacingAngle = 0.0;
    targetFacingAngle = 0.0;
    rotationFaceDuration = 0.5;
    rotationFaceProgress = 0.0;

    //rotationSpeed = 5.0;

    isRotating = false;
    pivotPoint = [0, 0, 0];
    rotateProgress = 0.0;
    rotateDuration = 2.0;
    rotationAngle = -90;
    currentSwingAngle = 0.0;

    isMoving = false;
    numMoves = 1;
    moveProgress = 0.0;
    startPos = [0, 0, 0];
    targetPos = [0, 0, 0];
    jumpHeight = 1.5;
    jumpDuration = 1.0;
    moveRange = 2.0;

    //#endregion

    //#region CONSTRUCTOR

    constructor(/*gl, shaderIds,*/ sourceMesh/*, generalInfo*/)
    {
        this.#mesh = { sourceMesh: sourceMesh };
        this.#modelMatrix = m4.identity();
        this.#position = [0, 0, 0];
    }

    //#endregion

    //#region GETTERS

    get position() 
    {
        return this.#position;
    }

    get modelmatrix()
    {
        return this.#modelMatrix;
    }

    //#endregion

    //#region SETTERS

    set position(pos)
    {
        const relX = pos[0] - this.#position[0];
        const relY = pos[1] - this.#position[1];
        const relZ = pos[2] - this.#position[2];

        this.#modelMatrix = m4.translate(this.#modelMatrix, relX, relY, relZ);
        this.#position = 
        [
            this.#modelMatrix[12],
            this.#modelMatrix[13],
            this.#modelMatrix[14]
        ];
    }

    set modelmatrix(matrix)
    {
        this.#modelMatrix = matrix;
    }

    setFacingDirection(targetPos, adjustAngle)
    {
        this.startFacingAngle = this.currentFacingAngle;
        this.rotationFaceProgress = 0.0;

        let dx = targetPos[0] - this.position[0];
        let dz = targetPos[2] - this.position[2];
        this.targetFacingAngle = Math.atan2(dx, dz) + adjustAngle; 
    }

    //#endregion

    //#region METHODS_MATH

    translate(x, y, z)
    {
        this.#modelMatrix = m4.translate(this.#modelMatrix, x, y, z);
        this.#position = 
        [
            this.#modelMatrix[12],
            this.#modelMatrix[13],
            this.#modelMatrix[14]
        ];
    }

    scale(value)
    {
        this.#modelMatrix = m4.scale(this.#modelMatrix, value, value, value);
    }

    moveStraight(deltaTimePhysics)
    {
        this.moveProgress += (deltaTimePhysics / this.jumpDuration);

        if (this.moveProgress >= 1.0)
        {
            this.moveProgress = 1.0;
            this.isMoving = false;
        }
            
        let p = this.moveProgress;

        let currentX = this.startPos[0] + (this.targetPos[0] - this.startPos[0]) * p;
        let currentZ = this.startPos[2] + (this.targetPos[2] - this.startPos[2]) * p;

        this.position = [currentX, this.position[1], currentZ];
        
    }

    rotatePivot(deltaTimePhysics, turnBackUp)
    {
        this.rotateProgress += (deltaTimePhysics / this.rotateDuration);

        if (this.rotateProgress >= 1.0)
        {
            this.rotateProgress = 1.0;
            this.currentSwingAngle = 0.0;
            this.isRotating = false;
        }

        let p = this.rotateProgress;

        if (turnBackUp)
        {
            this.currentSwingAngle = Utils.degToRad(this.rotationAngle) * Math.sin(p * Math.PI);
        }
        else 
        {
            this.currentSwingAngle = Utils.degToRad(this.rotationAngle) * p;
        }   
    }

    updateRotation(deltaTimePhysics)
    {
        /*let difference = this.targetFacingAngle - this.currentFacingAngle;
        let shortestAngle = Math.atan2(Math.sin(difference), Math.cos(difference));
        this.currentFacingAngle += shortestAngle * this.rotationSpeed * deltaTimePhysics;*/

        this.rotationFaceProgress += (deltaTimePhysics / this.rotationFaceDuration);

        if (this.rotationFaceProgress >= 1.0)
        {
            this.rotationFaceProgress = 1.0;
        }

        let p = this.rotationFaceProgress;
        
        let difference = this.targetFacingAngle - this.startFacingAngle;
        let shortestAngle = Math.atan2(Math.sin(difference), Math.cos(difference));
        this.currentFacingAngle = this.startFacingAngle + shortestAngle * p;
    }

    calculateWaypointStep()
    {
        let target = this.waypoints[this.currentWaypointIndex];
        let distX = target[0] - this.position[0];
        let distZ = target[2] - this.position[2];

        if (Math.abs(distX) < 0.1 && Math.abs(distZ) < 0.1)
        {
            this.currentWaypointIndex += 1;
            if (this.currentWaypointIndex >= this.waypoints.length) this.currentWaypointIndex = 0;

            target = this.waypoints[this.currentWaypointIndex];
            distX = target[0] - this.position[0];
            distZ = target[2] - this.position[2];
        }

        let tempTarget = [this.position[0], this.position[1], this.position[2]];

        if (Math.abs(distX) > 0.1)
        {
            tempTarget[0] += Math.sign(distX) * this.moveRange;
        }
        else if (Math.abs(distZ) > 0.1)
        {
            tempTarget[2] += Math.sign(distZ) * this.moveRange;
        }

        //console.log(target, distX, distZ, tempTarget);

        return tempTarget;
    }

    //#endregion

    //#region METHODS_DRAW

    async loadTexture(gl, source)
    {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);

        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width,
            height,
            border,
            srcFormat,
            srcType,
            pixel
        );

        const image = new Image();
        image.onload = () => 
        {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(
                gl.TEXTURE_2D,
                level,
                internalFormat,
                srcFormat,
                srcType,
                image
            );

            if (Utils.isPowerOf2(image.width) && Utils.isPowerOf2(image.height))
            {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
            else 
            {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            }
        };
        image.src = source;

        return texture;
    }

    async initializeMesh(gl)
    {
        await LoadMesh(gl, this.#mesh, this.objectData);
        this.#texture = await this.loadTexture(gl, this.objectData.mapKd);

        Utils.calculateTangent(this.objectData.mesh, this.objectData);

        if (this.objectData.mapBump != null)
        {
            this.#normalMap = await this.loadTexture(gl, this.objectData.mapBump);
        }

        if (this.objectData.mapNs != null)
        {
            this.#roughnessMap = await this.loadTexture(gl, this.objectData.mapNs);
        }

        if (this.objectData.mapRefl != null)
        {
            this.#metalnessMap = await this.loadTexture(gl, this.objectData.mapRefl);
        }
        
    }
    
    initializeAttributes(gl)
    {
        const arrays = 
        {
            position: 
            {
                numComponents: 3,
                data: this.objectData.positions
            },

            texCoord:
            {
                numComponents: 2,
                data: this.objectData.texcoords
            },

            normal:
            {
                numComponents: 3,
                data: this.objectData.normals
            },

            tangent:
            {
                numComponents: 3,
                data: this.objectData.tangents
            }
        }

        this.#bufferInfo = webglUtils.createBufferInfoFromArrays(gl, arrays);
    }

    draw(gl, programInfo, generalUniforms, drawmode) 
    {
        gl.useProgram(programInfo.program);

        const mode = drawmode !== undefined ? drawmode : gl.TRIANGLES;

        let drawMatrix = this.#modelMatrix;
        drawMatrix = m4.yRotate(drawMatrix, this.currentFacingAngle);
        if (this.isRotating || this.currentSwingAngle !== 0)
        {   
            drawMatrix = m4.translate(drawMatrix, this.pivotPoint[0], this.pivotPoint[1], this.pivotPoint[2]);
            drawMatrix = m4.zRotate(drawMatrix, this.currentSwingAngle);
            drawMatrix = m4.translate(drawMatrix, -this.pivotPoint[0], -this.pivotPoint[1], -this.pivotPoint[2]);
        }

        //#region UNIFORMS

        //const inverseModelMatrix = m4.inverse(this.#modelMatrix);
        const inverseModelMatrix = m4.inverse(drawMatrix);
        const normalMatrix = m4.transpose(inverseModelMatrix);

        let uniforms = 
        {
            ...generalUniforms,
            u_modelMatrix: drawMatrix,
            /*u_viewMatrix: this.#generalInfo.viewMatrix,
            u_projectionMatrix: this.#generalInfo.projectionMatrix,*/
            u_normalMatrix: normalMatrix,

            u_texture: this.#texture,
            //u_texture: this.objectData.texture,
            //u_normalMap: this.#normalMap,
            
            /*u_lightPosition: this.#generalInfo.lightPosition,
            u_cameraPosition: this.#generalInfo.cameraPosition,*/
            /*u_Ka: this.objectData.ambient,
            u_Kd: this.objectData.diffuse,
            u_Ks: this.objectData.specular,
            u_Ke: this.objectData.emissive,
            u_Ns: this.objectData.shininess,
            u_Ni: this.objectData.opacity,*/
        }

        if (this.objectData.mapBump != null)
        {
            uniforms.u_normalMap = this.#normalMap;
        }

        if (this.objectData.mapNs != null)
        {
            uniforms.u_roughnessMap = this.#roughnessMap;
        }
        else 
        {
            uniforms.u_Ns = this.objectData.shininess;
        }

        if (this.objectData.mapRefl != null)
        {
            uniforms.u_metalnessMap = this.#metalnessMap;
        }
        

        webglUtils.setUniforms(programInfo.uniformSetters, uniforms);

        //#endregion

        //#region ATTRIBUTES

        webglUtils.setBuffersAndAttributes(gl, programInfo.attribSetters, this.#bufferInfo);

        //#endregion

        //#region DRAW

        gl.drawArrays(mode, 0, this.objectData.numVertices);

        //#endregion
    }

    //#endregion
}