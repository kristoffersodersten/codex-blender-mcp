import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def hex_to_rgba(value):
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = hex_to_rgba(color)
    return mat


def create_sketch(payload):
    clear_scene()
    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.color = hex_to_rgba(payload["backgroundColor"])[:3]

    for index, stroke in enumerate(payload["strokes"]):
        curve = bpy.data.curves.new(f"stroke-{index + 1}", "CURVE")
        curve.dimensions = "3D"
        curve.resolution_u = 2
        curve.bevel_depth = stroke["width"] / 100
        curve.bevel_resolution = 2
        spline = curve.splines.new("POLY")
        spline.points.add(len(stroke["points"]) - 1)
        for point, coords in zip(spline.points, stroke["points"]):
            point.co = (coords[0], coords[1], 0, 1)
        obj = bpy.data.objects.new(f"stroke-{index + 1}", curve)
        obj.data.materials.append(material(f"stroke-mat-{index + 1}", stroke["color"]))
        bpy.context.collection.objects.link(obj)

    add_camera((0, 0, 12), (0, 0, 0))


def create_model(payload):
    clear_scene()
    for index, primitive in enumerate(payload["primitives"]):
        kind = primitive["kind"]
        location = primitive["location"]
        rotation = tuple(math.radians(v) for v in primitive["rotation"])
        if kind == "cube":
            bpy.ops.mesh.primitive_cube_add(size=2, location=location, rotation=rotation)
        elif kind == "sphere":
            bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=location, rotation=rotation)
        elif kind == "cylinder":
            bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1, depth=2, location=location, rotation=rotation)
        elif kind == "cone":
            bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=1, radius2=0, depth=2, location=location, rotation=rotation)
        elif kind == "torus":
            bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=0.25, location=location, rotation=rotation)
        else:
            raise ValueError(f"Unsupported primitive kind: {kind}")

        obj = bpy.context.object
        obj.name = primitive.get("name") or f"{kind}-{index + 1}"
        obj.scale = primitive["scale"]
        obj.data.materials.append(material(f"{obj.name}-mat", primitive["color"]))

    camera = payload["camera"]
    add_camera(camera["location"], camera["target"])
    add_light()


def run_python(payload):
    clear_scene()
    exec(payload["code"], {"bpy": bpy, "math": math, "Vector": Vector})


def add_camera(location, target):
    bpy.ops.object.camera_add(location=location)
    camera = bpy.context.object
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def add_light():
    bpy.ops.object.light_add(type="AREA", location=(0, -4, 6))
    light = bpy.context.object
    light.name = "Key Area Light"
    light.data.energy = 450
    light.data.size = 5


def main():
    args = sys.argv
    payload_path = Path(args[args.index("--") + 1])
    payload = json.loads(payload_path.read_text(encoding="utf-8"))

    mode = payload["mode"]
    if mode == "sketch":
        create_sketch(payload)
    elif mode == "model":
        create_model(payload)
    elif mode == "python":
        run_python(payload)
    else:
        raise ValueError(f"Unsupported mode: {mode}")

    output_path = Path(payload["outputPath"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_path))
    print(json.dumps({"ok": True, "outputPath": str(output_path)}))


if __name__ == "__main__":
    main()
