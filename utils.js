"use strict";

export function isPowerOf2(value)
{
    return (value & (value - 1)) === 0;
}

export function calculateDistance(pos1, pos2)
{
    const x = pos1[0] - pos2[0]
    const y = pos1[1] - pos2[1]
    const z = pos1[2] - pos2[2]

    return Math.sqrt(x**2 + y**2 + z**2)
}

export function printToLog(elementId, message, color = 'white')
{
    const logContainer = document.getElementById(elementId);
    
    const entry = document.createElement('div');
    entry.textContent = message;
    entry.style.color = color;
    entry.style.marginBottom = "4px";

    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

export function degToRad(d)
{
   return d * Math.PI / 180;
}

export function radToDeg(r)
{
    return r * 180 / Math.PI;
}

export function checkMoveFloor(startPos, targetPos, tileMatrix, rows, cols)
{
    const start = [startPos[0] / 2, 0, startPos[2] / 2];
    const target = [targetPos[0] / 2, 0, targetPos[2] / 2];

    if (target[0] < 0 || target[0] >= rows ||
        target[2] < 0 || target[2] >= cols)
    {
        return false;
    }

    /*console.log("%%%%%%%%%%%%%%%%");
    console.log("\n");
    console.log(startPos, start, tileMatrix[start[0] + start[2] * rows]);
    console.log(targetPos, target, tileMatrix[target[0] + target[2] * rows]);
    console.log("\n");
    console.log("%%%%%%%%%%%%%%%%");*/
    
    if (tileMatrix[target[0] + target[2] * rows] === 0 || tileMatrix[target[0] + target[2] * rows] === 2)
    {
        return false;
    } 
    else
    {
        tileMatrix[start[0] + start[2] * rows] = 1;
        tileMatrix[target[0] + target[2] * rows] = 0;
        return true;
    }
}

export function calculateTangent(mesh, objectData)
{
	for (let i = 1; i <= mesh.nface; i++)
	{
		const face = mesh.face[i];

		const pos0 = mesh.vert[face.vert[0]];
		const pos1 = mesh.vert[face.vert[1]];
		const pos2 = mesh.vert[face.vert[2]];

		const uv0 = mesh.textCoords[face.textCoordsIndex[0]];
        const uv1 = mesh.textCoords[face.textCoordsIndex[1]];
        const uv2 = mesh.textCoords[face.textCoordsIndex[2]];

        /*console.log("%%%%%%%%%%");
        console.log(p0, p1, p2);
        console.log(u0, u1, u2);
        console.log("%%%%%%%%%%");*/    

        const edge1 = [pos1.x - pos0.x, pos1.y - pos0.y, pos1.z - pos0.z];
        const edge2 = [pos2.x - pos0.x, pos2.y - pos0.y, pos2.z - pos0.z];

        const deltaUV1 = [uv1.u - uv0.u, uv1.v - uv0.v];
        const deltaUV2 = [uv2.u - uv0.u, uv2.v - uv0.v];

        const f = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);

        const tangent = [];
        tangent[0] = f * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]);
        tangent[1] = f * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]);
        tangent[2] = f * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2]);

        //console.log(tangent);
        for (let v = 0; v < 3; v++)
        {
            objectData.tangents.push(tangent[0], tangent[1], tangent[2]);
        }
	}
}