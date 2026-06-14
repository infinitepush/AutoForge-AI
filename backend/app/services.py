import json
import os
import re
from pathlib import Path
from typing import Any

from .schemas import VehicleConfiguration, VehicleType


CATALOG_PATH = Path(__file__).resolve().parents[2] / "assets" / "model-catalog.json"

# ---------------------------------------------------------------------------
# Performance spec tables
# ---------------------------------------------------------------------------

# (power_hp, torque_nm, zero_to_sixty_s, drivetrain)
_PERF: dict[VehicleType, dict[str, tuple[int, int, float, str]]] = {
    VehicleType.SUV: {
        "EV":     (500, 800, 4.2, "AWD permanent"),
        "Hybrid": (350, 580, 5.8, "AWD"),
        "Petrol": (300, 420, 6.4, "AWD"),
        "Diesel": (240, 560, 7.1, "AWD"),
    },
    VehicleType.SEDAN: {
        "EV":     (580, 900, 3.2, "AWD permanent"),
        "Hybrid": (320, 450, 5.4, "RWD"),
        "Petrol": (280, 380, 5.9, "RWD"),
        "Diesel": (200, 400, 7.8, "FWD"),
    },
    VehicleType.SPORTS: {
        "EV":     (750, 1050, 2.4, "AWD permanent"),
        "Hybrid": (510, 700, 3.6, "RWD"),
        "Petrol": (480, 620, 3.9, "RWD"),
        "Diesel": (350, 720, 5.2, "RWD"),
    },
}


def _perf(vehicle_type: VehicleType, powertrain: str) -> tuple[int, int, float, str]:
    return _PERF.get(vehicle_type, _PERF[VehicleType.SEDAN]).get(
        powertrain, (300, 420, 5.1, "AWD")
    )


def _vehicle_type(prompt: str) -> VehicleType:
    value = prompt.lower()
    if any(word in value for word in ("sports car", "supercar", "coupe", "roadster", "sports sedan")):
        return VehicleType.SPORTS
    if any(word in value for word in ("sedan", "saloon", "executive")):
        return VehicleType.SEDAN
    return VehicleType.SUV


def local_extract(prompt: str) -> VehicleConfiguration:
    value = prompt.lower()
    vehicle_type = _vehicle_type(prompt)
    seat_match = re.search(r"\b([2-7])[\s-]*(?:seat|seater)", value)
    seats = int(seat_match.group(1)) if seat_match else (7 if "family" in value else 4)
    powertrain = (
        "EV" if any(word in value for word in ("electric", " ev", "battery"))
        else "Hybrid" if "hybrid" in value
        else "Diesel" if "diesel" in value
        else "Petrol"
    )
    style = next(
        (word for word in ("futuristic", "aggressive", "luxury", "rugged", "minimal", "classic") if word in value),
        "modern",
    )
    color_map = {
        "black": "#090b0f", "white": "#e9e9e6", "red": "#7e1018",
        "blue": "#192c46", "green": "#34483b", "silver": "#a9afb8",
        "grey": "#6b7280", "gray": "#6b7280",
    }
    color = next((hex_value for name, hex_value in color_map.items() if name in value), "#192c46")
    offroad = any(word in value for word in ("off-road", "offroad", "rugged", "terrain"))
    sport = any(word in value for word in ("sport", "aggressive", "performance"))
    defaults = {
        VehicleType.SUV:    (2950, 215),
        VehicleType.SEDAN:  (2850, 155),
        VehicleType.SPORTS: (2700, 120),
    }
    wheelbase, clearance = defaults[vehicle_type]
    power, torque, z60, dt = _perf(vehicle_type, powertrain)

    # Derive engineering twin parameters
    if powertrain == "EV":
        engine_type = "EV Motor"
    else:
        if "v12" in value or "12 cylinder" in value:
            engine_type = "V12"
        elif "v8" in value or "8 cylinder" in value:
            engine_type = "V8"
        else:
            engine_type = "V6"

    if powertrain in ("EV", "Hybrid"):
        if "120" in value or "long range" in value or "large" in value or "120kwh" in value:
            battery_capacity = 120
        elif "100" in value or "standard range" in value or "medium" in value or "100kwh" in value:
            battery_capacity = 100
        else:
            battery_capacity = 75
    else:
        battery_capacity = 75

    if seats >= 6 or "long" in value or "family" in value or "extended" in value or "stretched" in value:
        chassis_length = "long"
    elif seats <= 2 or "short" in value or "compact" in value:
        chassis_length = "short"
    else:
        chassis_length = "standard"

    # Auto-adjust wheelbase based on chassis length
    if chassis_length == "long":
        wheelbase = 3200
    elif chassis_length == "short":
        wheelbase = 2700
    else:
        wheelbase = 2900

    return VehicleConfiguration(
        vehicle_type=vehicle_type,
        powertrain=powertrain,
        seats=seats,
        style=style,
        color=color,
        paint_finish="matte" if "matte" in value else "metallic",
        wheel_style="offroad" if offroad else "sport" if sport else "aero",
        suspension="air" if vehicle_type == VehicleType.SUV else "adaptive",
        terrain_mode="offroad" if offroad else "sport" if sport else "road",
        wheelbase=wheelbase,
        ground_clearance=clearance,
        engine_power=power,
        engine_torque=torque,
        zero_to_sixty=z60,
        drivetrain=dt,
        engine_type=engine_type,
        battery_capacity=battery_capacity,
        chassis_length=chassis_length,
    )


def extract_vehicle(prompt: str) -> tuple[VehicleConfiguration, str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return local_extract(prompt), "local"

    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        schema = VehicleConfiguration.model_json_schema()
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-pro"),
            contents=(
                "Convert the vehicle request into the supplied JSON schema. "
                "Support only SUV, Sedan, or Sports Car. Infer conservative engineering values. "
                "Set engine_power, engine_torque, zero_to_sixty, and drivetrain based on the powertrain and vehicle type. "
                "Also infer the appropriate engine_type, battery_capacity, and chassis_length based on the description.\n\n"
                f"Request: {prompt}"
            ),
            config={
                "response_mime_type": "application/json",
                "response_json_schema": schema,
                "temperature": 0.1,
            },
        )
        cfg = VehicleConfiguration.model_validate_json(response.text)
        # Always recalculate perf from lookup table to ensure accuracy
        power, torque, z60, dt = _perf(cfg.vehicle_type, cfg.powertrain)
        cfg.engine_power = power
        cfg.engine_torque = torque
        cfg.zero_to_sixty = z60
        cfg.drivetrain = dt
        
        # Recalculate wheelbase from chassis_length
        if cfg.chassis_length == "long":
            cfg.wheelbase = 3200
        elif cfg.chassis_length == "short":
            cfg.wheelbase = 2700
        else:
            cfg.wheelbase = 2900
            
        return cfg, "gemini"
    except Exception:
        return local_extract(prompt), "local-fallback"


def select_asset(configuration: VehicleConfiguration) -> dict[str, Any]:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    candidates = [item for item in catalog if item["vehicle_type"] == configuration.vehicle_type.value]
    if configuration.vehicle_type == VehicleType.SUV and configuration.terrain_mode == "offroad":
        return next(item for item in candidates if item["id"] == "mahindra-thar")
    prompt_tags = {configuration.style.lower(), configuration.powertrain.lower()}
    return max(candidates, key=lambda item: len(prompt_tags.intersection(set(item["tags"]))))
