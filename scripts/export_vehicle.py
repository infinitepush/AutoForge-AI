"""Run with Blender:

blender --background "source.blend" --python scripts/export_vehicle.py -- "output.glb"
"""

import sys
from pathlib import Path

import bpy


def output_path() -> Path:
    if "--" not in sys.argv:
        raise SystemExit("Expected output GLB path after --")
    return Path(sys.argv[sys.argv.index("--") + 1]).resolve()


target = output_path()
target.parent.mkdir(parents=True, exist_ok=True)

for obj in bpy.context.scene.objects:
    obj.select_set(obj.type in {"MESH", "ARMATURE", "EMPTY"})

bpy.ops.export_scene.gltf(
    filepath=str(target),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)

print(f"Exported {target}")

