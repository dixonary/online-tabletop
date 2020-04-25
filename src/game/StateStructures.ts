import { Quaternion, Vector3, Euler } from "three";

export type Dim3 = {
  width: number;
  height: number;
  depth: number;
};
export type Pos3 = {
  x: number;
  y: number;
  z: number;
};

export type Quat = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export const AxisAngle = ({ x, y, z, angle }: Pos3 & { angle: number }) => {
  return FromQuaternion(
    new Quaternion().setFromAxisAngle(new Vector3(x, y, z), angle)
  );
};

export const ToQuaternion = ({ x, y, z, w }: Quat) =>
  new Quaternion(x, y, z, w);
export const FromQuaternion = (q: Quaternion) => ({
  x: q.x,
  y: q.y,
  z: q.z,
  w: q.w,
});
export const ToEuler = (quat: Quat) =>
  new Euler().setFromQuaternion(ToQuaternion(quat));

export const FromEuler = (euler: Euler) =>
  FromQuaternion(new Quaternion().setFromEuler(euler));

export const Up: Pos3 = { x: 0, y: 1, z: 0 };
