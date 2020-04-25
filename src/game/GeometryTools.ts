import { Geometry, Box3, Vector2, Vector3, BufferGeometry, Face3 } from "three";

/**
 * Naively compute UV for a geometry.
 * @param geom
 */
const AutoUV = function (geom: Geometry) {
  if ((geom as any).hasBeenAutoUV) return;
  (geom as any).hasBeenAutoUV = true;

  geom.computeBoundingBox();

  const bb = geom.boundingBox as Box3;
  const size = bb.getSize(new Vector3(0, 0, 0));
  const bc = bb.getCenter(new Vector3(0, 0, 0));
  for (let i = 0; i < geom.faces.length; i++) {
    const face = geom.faces[i];

    const a = geom.vertices[face.a];
    const b = geom.vertices[face.b];
    const c = geom.vertices[face.c];

    const flat = a.y === b.y && a.y === c.y;
    const deep = a.x === b.x && b.x === c.x;
    const wide = a.z === b.z && a.z === c.z;

    geom.faceVertexUvs[0][i] = [a, b, c].map(({ x, y, z }: Vector3) => {
      const x2 = (x - bc.x) / size.x + 0.5;
      const y2 = (y - bc.y) / size.y + 0.5;
      const z2 = (z - bc.z) / size.z + 0.5;

      if (wide) return new Vector2(x2, y2);
      if (flat) return new Vector2(x2, z2);
      if (deep) return new Vector2(z2, y2);
      throw new Error("Non-orthogonal face found!");
    });
  }
  return geom;
};

/**
 * Given a geometry, scale it to fit a given bounding box.
 * This will not preserve uniformity of scale.
 * @param geom The geometry to scale.
 * @param newSize The new bounding box.
 */
const ResizeToFit = function (
  geom: Geometry | BufferGeometry,
  newSize: Vector3
) {
  // TODO: Fix this hack
  if ((geom as any).hasBeenScaled) return;
  (geom as any).hasBeenScaled = true;

  geom.computeBoundingBox();
  const bb = geom.boundingBox as Box3;
  const size = bb.getSize(new Vector3(0, 0, 0));

  geom.scale(newSize.x / size.x, newSize.y / size.y, newSize.z / size.z);
};

/**
 * Given a geometry, compute the materials for each face corresponding to its
 * orthogonal orientation in 3d space.
 * @param geom The geometry to compute for.
 * @param materialIndices The indices to apply to each orientation.
 */
const ApplyFaceMaterials = function (
  geom: Geometry,
  materialIndices: { flat: number; deep: number; wide: number; other: number }
) {
  // TODO: Fix this hack
  if ((geom as any).hasBeenMatted) return;
  (geom as any).hasBeenMatted = true;

  geom.faces.forEach((face: Face3) => {
    const a = geom.vertices[face.a];
    const b = geom.vertices[face.b];
    const c = geom.vertices[face.c];
    const flat = a.y === b.y && a.y === c.y;
    const deep = a.x === b.x && b.x === c.x;
    const wide = a.z === b.z && a.z === c.z;
    if (flat) face.materialIndex = materialIndices.flat;
    else if (deep) face.materialIndex = materialIndices.deep;
    else if (wide) face.materialIndex = materialIndices.wide;
    else face.materialIndex = materialIndices.other;
  });
};

export { AutoUV, ResizeToFit, ApplyFaceMaterials };
