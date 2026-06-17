"use strict";
import { SceneObject } from "./sceneObject.js";
import * as Utils  from "./utils.js"

function main()
{
    const settingsMenu = document.getElementById("settings-menu");
    const closeSettingsButton = document.getElementById("close-settings-menu");
    const nextTurnButton = document.getElementById("next-turn");
    //const gameLog = document.getElementById("game-log");

    const canvas = document.querySelector("#glcanvas");
    canvas.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    canvas.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    canvas.focus();

    const gl = canvas.getContext("webgl");
    if (gl == null)
    {
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    }

    const ext = gl.getExtension('WEBGL_depth_texture');
    if (!ext) 
    {
        alert('need WEBGL_depth_texture');  // eslint-disable-line
    }

    const depthTexture = gl.createTexture();
    const depthTextureSize = 4096;
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.DEPTH_COMPONENT,
        depthTextureSize,
        depthTextureSize,
        0,
        gl.DEPTH_COMPONENT,
        gl.UNSIGNED_INT,
        null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D,
        depthTexture,
        0
    );

    const lightShadowProgramInfo = webglUtils.createProgramInfo(gl, ['lightShadowVertex', 'lightShadowFragment']);
    const colorProgramInfo = webglUtils.createProgramInfo(gl, ['colorVertex', 'colorFragment']);

    const lightShadowBumpProgramInfo = webglUtils.createProgramInfo(gl, ['lightShadowBumpVertex', 'lightShadowBumpFragment']);
    const lightShadowBumpShininessProgramInfo = webglUtils.createProgramInfo(gl, ['lightShadowBumpVertex', 'lightShadowBumpShininessFragment']);
    const lightShadowBumpShininessMetalnessProgramInfo = webglUtils.createProgramInfo(gl, ['lightShadowBumpVertex', 'lightShadowBumpShininessMetalnessFragment']);

    let numTurn = 1;

    //#region CONTROLS

    const controlsCamera = 
    {
        zNear: 0.001,
        zFar: 100,
        D: 3.0,
        theta: 3.05,
        phi: 1.22,
        fieldOfView: 40,
    }

    const controlsLighting =
    {
        x: 3,
        y: 4,
        z: 3,
        fieldOfView: 120,
        bias: -0.001
    }

    const controlsTesting =
    {
        moveMainObject: false,
        moveLight: false,
        followMainObject: false,
    }

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    defineGui(controlsCamera, controlsLighting, controlsTesting);

    //#endregion

    //#region OBJECTS

    const rows = 15;
    const cols = 15;

    let floorMatrix = new Int8Array(rows * cols).fill(1);
    for (let k = 0; k < 4; k++) {
        let starti = k < 2 ? 3: 10;
        let startj = k % 2 === 0 ? 3: 10
        for (let i = starti; i < starti + 2; i++) {
            for (let j = startj; j < startj + 2; j++) {
                floorMatrix[j + i * rows] = 2;
            }
        }
    }

    let ceilingMatrix = new Int8Array(floorMatrix);


    let floor = new SceneObject("resources/data/walls/floor.obj");
    let ceiling = new SceneObject("resources/data/walls/ceiling.obj");
    let walls = new SceneObject("resources/data/walls/walls.obj");
    const pillarPositions = 
    [
        [3, 0, 3],
        [10, 0, 3],
        [3, 0, 10],
        [10, 0, 10],
    ];
    let pillar = new SceneObject("resources/data/walls/pillar.obj");

    let mainObject = new SceneObject("resources/data/phantom/phantom.obj");
    mainObject.position = [2, 0, 2];
    let hammer = new SceneObject("resources/data/hammer/hammer.obj");
    hammer.pivotPoint = [0.326137, 0.744206, 0.472353];
    floorMatrix[0] = 0;

    let skeleton = new SceneObject("resources/data/skeleton/skeleton.obj");
    //skeleton.position = [2, 0, 0];
    //floorMatrix[skeleton.position[0] / 2 + skeleton.position[2] / 2 * rows] = 0
    const skeletonPositions = 
    [
        [2, 0, 4],
        [10, 0, 5],
        [4, 0, 9],
        [14, 0, 9],
        [10, 0, 12],
    ];
    for (let i = 0; i < skeletonPositions.length; i++)
    {
        const pos = skeletonPositions[i];
        floorMatrix[pos[0] + pos[2] * rows] = 0;
    }

    let rats = [];
    //let rat = new SceneObject("resources/data/rat/rat.obj");
    const ratPositions = 
    [
        [7, 0, 0],
        [3, 0, 6],
        [7, 0, 10],
        [14, 0, 14],
    ];
    let currRats = ratPositions.length;
    for (let i = 0; i < ratPositions.length; i++)
    {
        const pos = ratPositions[i];
        rats[i] = new SceneObject("resources/data/rat/rat.obj");
        rats[i].position = [pos[0] * 2, 0, pos[2] * 2 ];
        floorMatrix[pos[0] + pos[2] * rows] = 0;
    }

    const chestPosition = [2, 0, 3];
    let chestOpened = false;
    let chestTop = new SceneObject("resources/data/chest/chest_top.obj");
    chestTop.position = [chestPosition[0] * 2, 0, chestPosition[2] * 2];
    chestTop.pivotPoint = [0.477224, 0.533019, 0.519912];
    let chestBot = new SceneObject("resources/data/chest/chest_bot.obj");
    chestBot.position = [chestPosition[0] * 2, 0, chestPosition[2] * 2];
    floorMatrix[chestPosition[0] + chestPosition[2] * rows] = 0;

    const batWaypoints = 
    [
        [2, 0, 26],
        [14, 0, 26],
        [14, 0, 2],
        [26, 0, 2],
        [26, 0, 26],
        [14, 0, 26],
        [14, 0, 2],
        [2, 0, 2],

        /*[28, 0, 0],
        [28, 0, 14],
        [0, 0, 14],
        [0, 0, 28],
        [28, 0, 28],
        [28, 0, 14],
        [0, 0, 14],
        [0, 0, 0]*/
    ];
    let batCore = new SceneObject("resources/data/bat/bat_core.obj");
    let batLeftWing = new SceneObject("resources/data/bat/bat_leftWing.obj");
    let batRightWing = new SceneObject("resources/data/bat/bat_rightWing.obj");
    batCore.waypoints = batWaypoints;
    batCore.isPatrolling = true;

    batCore.position = [2, 0, 2];
    batLeftWing.position = batCore.position;
    batRightWing.position = batCore.position;


    let bulb = new SceneObject("resources/data/bulb/bulb.obj");
    bulb.position = batCore.position;
    let lightPosition = [batCore.position[0], 3.7, batCore.position[2]];

    //const entities = [skeleton, rat];

    (async () => 
        {
            await floor.initializeMesh(gl);
            floor.initializeAttributes(gl);
            await ceiling.initializeMesh(gl);
            ceiling.initializeAttributes(gl);
            await walls.initializeMesh(gl);
            walls.initializeAttributes(gl);
            await pillar.initializeMesh(gl);
            pillar.initializeAttributes(gl);

            await mainObject.initializeMesh(gl);
            mainObject.initializeAttributes(gl);
            await hammer.initializeMesh(gl);
            hammer.initializeAttributes(gl);

            await skeleton.initializeMesh(gl);
            skeleton.initializeAttributes(gl);

            for (let i = 0; i < rats.length; i++)
            {
                await rats[i].initializeMesh(gl);
                rats[i].initializeAttributes(gl);
            }
            
            await chestTop.initializeMesh(gl);
            chestTop.initializeAttributes(gl);
            await chestBot.initializeMesh(gl);
            chestBot.initializeAttributes(gl);

            await batCore.initializeMesh(gl);
            batCore.initializeAttributes(gl);
            await batLeftWing.initializeMesh(gl);
            batLeftWing.initializeAttributes(gl);
            await batRightWing.initializeMesh(gl);
            batRightWing.initializeAttributes(gl);

            await bulb.initializeMesh(gl);
            bulb.initializeAttributes(gl);

            requestAnimationFrame(update);
        }
    )();

    //#endregion

    //#region EVENTS

    let drag;
    let old_x, old_y;
    let dX, dY;

    let isMenuOpen = false;
    let playerTurn = true;

    canvas.addEventListener("mousedown", (event) => 
    {
        event.preventDefault();

        canvas.focus();
        drag = true;
        old_x = event.pageX;
        old_y = event.pageY;
    }, 
    false);

    canvas.addEventListener("mouseup", (event) => 
    {
        event.preventDefault();

        drag = false;
    },
    false);

    canvas.addEventListener("mouseout", (event) => 
    {
        event.preventDefault();

        drag = false;
    },
    false);

    canvas.addEventListener("mousemove", (event) =>
    {
        event.preventDefault();

        if (drag)
        {
            dX = (event.pageX - old_x) * 2 * Math.PI / canvas.width;
            dY = (event.pageY - old_y) * 2 * Math.PI / canvas.height;
            controlsCamera.theta += 0.75 * dX;

            //const maxPhi = (Math.PI / 2) - 0.05;
            controlsCamera.phi += 0.75 * dY;
            //controlsCamera.phi = Math.max(0.1, Math.min(maxPhi, controlsCamera.phi + 0.75 * dY));
            
            old_x = event.pageX;
            old_y = event.pageY;
        }
    },
    false);

    canvas.addEventListener("wheel", (event) =>
    {
        if (event.deltaY < 0) 
        {
            controlsCamera.D += 0.2;
        }
        else if (event.deltaY > 0) 
        {
            controlsCamera.D -= 0.2;
        }
        controlsCamera.D = Math.max(1.0, Math.min(3.0, controlsCamera.D));
    },
    false);

    window.addEventListener("keydown", (event) =>
    {
        event.preventDefault();

        // INTERACTION
        //if (event.code === 'KeyE' && playerTurn && !mainObject.isMoving && mainObject.flag === 1) 
        if (event.code === 'KeyE' && playerTurn && !mainObject.isMoving && !hammer.isRotating)
        {
            console.log("interaction E");

            if (chestOpened)
            {
                hammer.rotationAngle = -90;
                hammer.rotateProgress = 0.0;
                hammer.isRotating = true;

                for (let i = 0; i < rats.length; i++)
                {   
                    console.log("%%%%%%%");
                    console.log(rats[i].position);
                    console.log(mainObject.position);
                    console.log("%%%%%%%");
                    if(
                        !rats[i].isDead &&
                        ((mainObject.position[0] === rats[i].position[0] && mainObject.position[2] === rats[i].position[2] - 2) ||
                        (mainObject.position[0] === rats[i].position[0] && mainObject.position[2] === rats[i].position[2] + 2) ||
                        (mainObject.position[0] === rats[i].position[0] - 2 && mainObject.position[2] === rats[i].position[2]) ||
                        (mainObject.position[0] === rats[i].position[0] + 2 && mainObject.position[2] === rats[i].position[2]))
                    )
                    {
                        floorMatrix[rats[i].position[0] / 2 + rats[i].position[2] / 2 * rows] = 1;
                        rats[i].isDead = true;
                        currRats -= 1;
                        Utils.printToLog("game-log", "You have killed a rat: " + currRats + " rats remaining");
                    }
                }
            }



            if (
                !chestOpened &&
                ((mainObject.position[0] === chestPosition[0] * 2 && mainObject.position[2] === chestPosition[2] * 2 - 2) ||
                (mainObject.position[0] === chestPosition[0] * 2 && mainObject.position[2] === chestPosition[2] * 2 + 2) ||
                (mainObject.position[0] === chestPosition[0] * 2 - 2 && mainObject.position[2] === chestPosition[2] * 2) ||
                (mainObject.position[0] === chestPosition[0] * 2 + 2 && mainObject.position[2] === chestPosition[2] * 2))
            )
            {
                Utils.printToLog("game-log", "Hammer acquired. Now you can kill the rats!");
                chestOpened = true;

                chestTop.rotationAngle = -90;
                chestTop.rotateProgress = 0.0;
                chestTop.isRotating = true;

                hammer.position = mainObject.position;
            }
        }

        if (event.code === 'KeyW') 
        {
            if (playerTurn && !mainObject.isMoving && mainObject.numMoves !== 0)
            {
                console.log("interaction W");
                mainObject.startPos = mainObject.position;
                mainObject.targetPos = [mainObject.position[0] + mainObject.moveRange, mainObject.position[1], mainObject.position[2]];
                
                if (Utils.checkMoveFloor(mainObject.startPos, mainObject.targetPos, floorMatrix, rows, cols))
                {
                    mainObject.moveProgress = 0.0;
                    mainObject.isMoving = true;
                    mainObject.numMoves -= 1;

                    mainObject.setFacingDirection(mainObject.targetPos, - Math.PI / 2);

                    if (chestOpened)
                    {
                        hammer.startPos = hammer.position;
                        hammer.targetPos = [hammer.position[0] + mainObject.moveRange, hammer.position[1], hammer.position[2]];
                        hammer.moveProgress = 0.0;
                        hammer.isMoving = true;

                        hammer.setFacingDirection(mainObject.targetPos, - Math.PI / 2);
                    }
                }
                else 
                {
                    Utils.printToLog("game-log", "You can't move there");
                }
            }
        }

        if (event.code === 'KeyA') 
        {
            if (playerTurn && !mainObject.isMoving && mainObject.numMoves !== 0) 
            {
                console.log("interaction A");
                mainObject.startPos = mainObject.position;
                mainObject.targetPos = [mainObject.position[0], mainObject.position[1], mainObject.position[2] - mainObject.moveRange];
                
                if (Utils.checkMoveFloor(mainObject.startPos, mainObject.targetPos, floorMatrix, rows, cols))
                {
                    mainObject.moveProgress = 0.0;
                    mainObject.isMoving = true;
                    mainObject.numMoves -= 1;

                    mainObject.setFacingDirection(mainObject.targetPos, - Math.PI / 2);

                    if (chestOpened)
                    {
                        hammer.startPos = hammer.position;
                        hammer.targetPos = [hammer.position[0], hammer.position[1], hammer.position[2] - mainObject.moveRange];
                        hammer.moveProgress = 0.0;
                        hammer.isMoving = true;

                        hammer.setFacingDirection(mainObject.targetPos, - Math.PI / 2);
                    }
                }
                else 
                {
                    Utils.printToLog("game-log", "You can't move there");
                }
            }
        }

        if (event.code === 'KeyS') 
        {
            if (playerTurn && !mainObject.isMoving && mainObject.numMoves !== 0)
            {
                console.log("interaction S");
                mainObject.startPos = mainObject.position;
                mainObject.targetPos = [mainObject.position[0] - mainObject.moveRange, mainObject.position[1], mainObject.position[2]];
                
                if (Utils.checkMoveFloor(mainObject.startPos, mainObject.targetPos, floorMatrix, rows, cols))
                {
                    mainObject.moveProgress = 0.0;
                    mainObject.isMoving = true;
                    mainObject.numMoves -= 1;

                    mainObject.setFacingDirection(mainObject.targetPos, - Math.PI / 2);

                    if (chestOpened)
                    {
                        hammer.startPos = hammer.position;
                        hammer.targetPos = [hammer.position[0] - mainObject.moveRange, hammer.position[1], hammer.position[2]];
                        hammer.moveProgress = 0.0;
                        hammer.isMoving = true;

                        hammer.setFacingDirection(mainObject.targetPos, - Math.PI / 2);
                    }
                }
                else 
                {
                    Utils.printToLog("game-log", "You can't move there");
                }
            }
        }

        if (event.code === 'KeyD') 
        {
            if (playerTurn && !mainObject.isMoving && mainObject.numMoves !== 0) 
            {
                console.log("interaction D");
                mainObject.startPos = mainObject.position;
                mainObject.targetPos = [mainObject.position[0], mainObject.position[1], mainObject.position[2] + mainObject.moveRange];
                
                if (Utils.checkMoveFloor(mainObject.startPos, mainObject.targetPos, floorMatrix, rows, cols))
                {
                    mainObject.moveProgress = 0.0;
                    mainObject.isMoving = true;
                    mainObject.numMoves -= 1;

                    mainObject.setFacingDirection(mainObject.targetPos, - Math.PI / 2);

                    if (chestOpened)
                    {
                        hammer.startPos = hammer.position;
                        hammer.targetPos = [hammer.position[0], hammer.position[1], hammer.position[2] + mainObject.moveRange];
                        hammer.moveProgress = 0.0;
                        hammer.isMoving = true;

                        hammer.setFacingDirection(mainObject.targetPos, - Math.PI / 2);
                    }
                }
                else 
                {
                    Utils.printToLog("game-log", "You can't move there");
                }
            }
        }

        // SETTINGS MENU
        if (event.code === 'Escape') 
        {
            toggleMenu();
        }

        // NEXT TURN
        if (event.code === 'KeyN')
        {
            nextTurn();
        }
        
        //console.log(event.code)
    },
    false);

    closeSettingsButton.addEventListener("click", () => 
    {
        toggleMenu();
    },
    false);

    function toggleMenu()
    {
        isMenuOpen = !isMenuOpen

        if (isMenuOpen)
        {
            settingsMenu.style.display = "block";
        }
        else 
        {
            settingsMenu.style.display = "none";
            canvas.focus();
        }
    }


    let ratsMoving = [];
    nextTurnButton.addEventListener("click", () =>
    {
        nextTurn();
    },
    false);

    function nextTurn()
    {
        if (playerTurn && !mainObject.isMoving && !chestTop.isRotating)
        {
            mainObject.numMoves = 1;
            Utils.printToLog("game-log", "Finished Turn " + numTurn);
            numTurn += 1;

            // BAT AND LIGHT
            batCore.startPos = batCore.position;
            let patrolTargetBat = batCore.calculateWaypointStep();
            if (Utils.checkMoveFloor(batCore.startPos, patrolTargetBat, ceilingMatrix, rows, cols))
            {
                batCore.targetPos = patrolTargetBat;
                batCore.moveProgress = 0.0;
                batCore.isMoving = true;
                batCore.setFacingDirection(patrolTargetBat, 0);
                batLeftWing.setFacingDirection(patrolTargetBat, 0);
                batRightWing.setFacingDirection(patrolTargetBat, 0);
            }

            // RATS
            let randomInt;
            ratsMoving = [];
            for (let i = 0; i < rats.length; i++)
            {
                rats[i].startPos = rats[i].position;

                let directions = [0, 1, 2, 3];
                for (let j = directions.length - 1; j > 0; j--)
                {
                    const k = Math.floor(Math.random() * (j + 1));
                    [directions[j], directions[k]] = [directions[k], directions[j]];
                }

                let foundValidMove = false;
                for (let d = 0; d < directions.length; d++)
                {
                    let dir = directions[d];
                    let tempTarget = [rats[i].position[0], rats[i].position[1], rats[i].position[2]];

                    if (dir === 0) tempTarget[0] += rats[i].moveRange;      // Right
                    else if (dir === 1) tempTarget[0] -= rats[i].moveRange; // Left
                    else if (dir === 2) tempTarget[2] += rats[i].moveRange; // Forward
                    else if (dir === 3) tempTarget[2] -= rats[i].moveRange; // Backward

                    if (Utils.checkMoveFloor(rats[i].startPos, tempTarget, floorMatrix, rows, cols))
                    {
                        rats[i].targetPos = tempTarget;
                        rats[i].moveProgress = 0.0;
                        rats[i].isMoving = true;
                        ratsMoving[i] = true;
                        foundValidMove = true;

                        rats[i].setFacingDirection(tempTarget, 0);

                        break;
                    }
                }

                if (!foundValidMove)
                {
                    ratsMoving[i] = false;
                }
            }
        
            playerTurn = false;
        }
    }


    //#endregion

    function playerDoStep()
    {
        if (mainObject.isMoving) 
        {
            mainObject.moveStraight(deltaTimePhysics);
            hammer.moveStraight(deltaTimePhysics);

            mainObject.updateRotation(deltaTimePhysics);
            hammer.updateRotation(deltaTimePhysics);
        }

        

        if (hammer.isRotating)
        {
            hammer.rotatePivot(deltaTimePhysics, true);
        }

        if (chestTop.isRotating)
        {
            chestTop.rotatePivot(deltaTimePhysics, false);
        }
    }

    function enemiesDoStep()
    {
        if(batCore.isMoving)
        {
            batCore.moveStraight(deltaTimePhysics);
            batLeftWing.position = batCore.position;
            batRightWing.position = batCore.position;
            bulb.position = batCore.position;
            lightPosition = [batCore.position[0], 3.7, batCore.position[2]];

            batCore.updateRotation(deltaTimePhysics);
            batLeftWing.updateRotation(deltaTimePhysics);
            batRightWing.updateRotation(deltaTimePhysics);
        }

        let isAnyRatMoving = false;
        for (let i = 0; i < rats.length; i++)
        {
            if (ratsMoving[i])
            {
                rats[i].moveStraight(deltaTimePhysics);
                rats[i].updateRotation(deltaTimePhysics);

                if (rats[i].isMoving) 
                {
                    isAnyRatMoving = true;
                }
                else
                {
                    ratsMoving[i] = false;
                }
            }
        }

        if (!isAnyRatMoving)
        {
            playerTurn = true;
            ratsMoving = [];
        }
        
    }

    function drawScene(projectionMatrix, cameraMatrix, textureMatrix, lightWorldMatrix, programInfo, lightShadowBumpProgramInfo, lightShadowBumpShininessProgramInfo, lightShadowBumpShininessMetalnessProgramInfo)
    {
        const viewMatrix = m4.inverse(cameraMatrix);

        //gl.useProgram(programInfo.program);

        const generalUniforms = {
            u_viewMatrix: viewMatrix,
            u_projectionMatrix: projectionMatrix,
            u_bias: controlsLighting.bias,
            u_textureMatrix: textureMatrix,
            u_projectedTexture: depthTexture,
            u_innerLimit: Math.cos(Utils.degToRad(controlsLighting.fieldOfView / 2 - 10)),
            u_outerLimit: Math.cos(Utils.degToRad(controlsLighting.fieldOfView / 2)),
            u_lightDirection: lightWorldMatrix.slice(8, 11)/*.map(v => -v)*/,

            //u_lightPosition: [controlsLighting.x, controlsLighting.y, controlsLighting.z],
            u_lightPosition: lightPosition,
            u_cameraPosition: cameraMatrix.slice(12, 15)
        };

        //if (!shadowPass) 
        floor.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);

        gl.disable(gl.CULL_FACE);
        mainObject.draw(gl, lightShadowBumpProgramInfo, generalUniforms);

        walls.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);
        ceiling.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);
        for (let i = 0; i < 4; i++)
        {
            let modelMatrix = m4.identity();
            modelMatrix = m4.translate(modelMatrix, pillarPositions[i][0] * 2, 0, pillarPositions[i][2] * 2);
            pillar.modelmatrix = modelMatrix;
            pillar.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);
        }

        chestTop.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);
        chestBot.draw(gl, lightShadowBumpShininessProgramInfo, generalUniforms);
        gl.enable(gl.CULL_FACE);

        if (chestOpened) hammer.draw(gl, lightShadowBumpShininessMetalnessProgramInfo, generalUniforms);
        
        batCore.draw(gl, programInfo, generalUniforms);
        batLeftWing.draw(gl, programInfo, generalUniforms);
        batRightWing.draw(gl, programInfo, generalUniforms);
        bulb.draw(gl, programInfo, generalUniforms);

        for (let i = 0; i < rats.length; i++) 
        {
            if(!rats[i].isDead) rats[i].draw(gl, programInfo, generalUniforms);
        }

        for (let i = 0; i < skeletonPositions.length; i++)
        {
            let modelMatrix = m4.identity();
            modelMatrix = m4.translate(modelMatrix, skeletonPositions[i][0] * 2, 0, skeletonPositions[i][2] * 2);
            modelMatrix = m4.yRotate(modelMatrix, - i * Math.PI / 8);
            skeleton.modelmatrix = modelMatrix;
            skeleton.draw(gl, programInfo, generalUniforms);
        }
    }
        
    function render()
    {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // RENDER FOR SHADOW
        const lightWorldMatrix = m4.lookAt(
            //[controlsLighting.x, controlsLighting.y, controlsLighting.z],
            //bulb.position,
            lightPosition,
            //[0, 0, 0], // TODO -> modify this!
            [lightPosition[0] - 1, 0, lightPosition[2] - 1],
            [0, 1, 0]
        );

        const lightProjectionMatrix = m4.perspective(
            Utils.degToRad(controlsLighting.fieldOfView),
            /*aspect, //CHECK this if errors occur
            controlsCamera.zNear,
            controlsCamera.zFar*/
            //3 / 2.4,
            aspect,
            0.5,
            40.0
        );

        gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
        gl.viewport(0, 0, depthTextureSize, depthTextureSize);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        drawScene(
            lightProjectionMatrix,
            lightWorldMatrix,
            m4.identity(),
            lightWorldMatrix,
            colorProgramInfo,
            colorProgramInfo,
            colorProgramInfo,
            colorProgramInfo,
        );

        // RENDER FOR VIEW
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let textureMatrix = m4.identity();
        textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
        textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
        textureMatrix = m4.multiply(textureMatrix, m4.inverse(lightWorldMatrix));

        let at = [mainObject.position[0], mainObject.position[1] + 1, mainObject.position[2]];

        const projectionMatrix =  m4.perspective(Utils.degToRad(controlsCamera.fieldOfView), aspect, controlsCamera.zNear, controlsCamera.zFar);
        let eye = 
        [  
            at[0] + controlsCamera.D * Math.sin(controlsCamera.phi) * Math.cos(controlsCamera.theta),
            at[1] + controlsCamera.D * Math.cos(controlsCamera.phi),
            at[2] + controlsCamera.D * Math.sin(controlsCamera.phi) * Math.sin(controlsCamera.theta)
        ];
        const up = [0, 1, 0];
        let cameraMatrix = m4.lookAt(eye, at, up);

        drawScene(
            projectionMatrix,
            cameraMatrix,
            textureMatrix,
            lightWorldMatrix,
            lightShadowProgramInfo,
            lightShadowBumpProgramInfo,
            lightShadowBumpShininessProgramInfo,
            lightShadowBumpShininessMetalnessProgramInfo           
        );
    }

    let lastTime = 0, frameTime = 0;
    let accumulator = 0;
    let toUpdate = false;
    const deltaTimePhysics = 1 / 60;

    function update(currentTime)
    {
        //console.log(controlsLighting.bias);
        currentTime *= 0.001;
        frameTime = currentTime - lastTime;
        lastTime = currentTime;

        accumulator += frameTime;

        toUpdate = false;

        while (accumulator >= deltaTimePhysics)
        {
            if (playerTurn)
            {
                playerDoStep();
            }
            else 
            {
                enemiesDoStep();
            }

            accumulator -= deltaTimePhysics;
            toUpdate = true;
        }

        if (toUpdate)
        {
            render()
        }

        requestAnimationFrame(update)
    }
}

function defineGui(controlsCamera, controlsLighting, controlsTesting)
{
    const gui = new dat.GUI();
    const dr = 5.0 * Math.PI / 180.0;

    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(controlsCamera, "zNear").min(1).max(10).step(1);
    cameraFolder.add(controlsCamera,"zFar").min(1).max(100).step(1);
    cameraFolder.add(controlsCamera,"D").min(0).max(4).step(1);
    cameraFolder.add(controlsCamera,"theta").min(0).max(6.28).step(dr);
    cameraFolder.add(controlsCamera,"phi").min(0).max(3.14).step(dr);
    cameraFolder.add(controlsCamera,"fieldOfView").min(10).max(120).step(5);
    cameraFolder.open();

    const lightingFolder = gui.addFolder('Lighting');
    lightingFolder.add(controlsLighting, "x", -10, 10).step(1);
    lightingFolder.add(controlsLighting, "y", -10, 10).step(1);
    lightingFolder.add(controlsLighting, "z", -10, 10).step(1);
    lightingFolder.add(controlsLighting, "fieldOfView").min(10).max(240).step(5);
    lightingFolder.add(controlsLighting, "bias", -0.1, 0.1).step(0.0001);
    lightingFolder.open();

    const testFolder = gui.addFolder("Testing");
    testFolder.add(controlsTesting, "moveMainObject");
    testFolder.add(controlsTesting, "followMainObject");
    testFolder.open();
}

main();