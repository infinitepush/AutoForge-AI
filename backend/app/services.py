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
    offroad = any(word in value for word in ("off-road", "offroad", "rugged", "terrain", "mountain", "himalayan", "expedition", "4x4"))
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


# ---------------------------------------------------------------------------
# Smart Platform Selection — keyword intent scoring
# ---------------------------------------------------------------------------

_REASON_TEMPLATES = {
    "mahindra-thar":  "Off-road / rugged terrain intent detected",
    "range-rover-suv": "Luxury / premium flagship intent detected",
    "mercedes-amg":   "Urban executive / high-performance intent detected",
    "chevy-suv":      "Family / practical daily-use intent detected",
}


def select_asset(configuration: VehicleConfiguration, prompt: str = "") -> dict[str, Any]:
    """
    Score each catalog vehicle against the user prompt keywords and 
    configuration signals, then return the best-matching asset with 
    a human-readable selection_reason.
    """
    catalog: list[dict] = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    prompt_lower = prompt.lower()

    best_item = None
    best_score = -1

    for item in catalog:
        score = 0
        keywords: list[str] = item.get("intent_keywords", item.get("tags", []))
        for kw in keywords:
            if kw in prompt_lower:
                score += 2  # direct prompt match is strongest signal

        # Configuration-based bonus signals
        if item["id"] == "mahindra-thar":
            if configuration.terrain_mode == "offroad":
                score += 4
            if configuration.wheel_style == "offroad":
                score += 2
            if configuration.ground_clearance and configuration.ground_clearance >= 220:
                score += 2

        elif item["id"] == "range-rover-suv":
            if configuration.style in ("luxury", "classic"):
                score += 4
            if configuration.suspension == "air":
                score += 2
            if configuration.wheel_style == "luxury":
                score += 2

        elif item["id"] == "mercedes-amg":
            if configuration.style in ("futuristic", "aggressive", "modern"):
                score += 3
            if configuration.powertrain in ("EV", "Hybrid"):
                score += 2
            if configuration.terrain_mode == "sport":
                score += 2

        elif item["id"] == "chevy-suv":
            if configuration.seats >= 5:
                score += 2
            if configuration.chassis_length == "long":
                score += 2

        if score > best_score:
            best_score = score
            best_item = item

    # Fallback to Range Rover if nothing matched
    if best_item is None:
        best_item = next((i for i in catalog if i["id"] == "range-rover-suv"), catalog[0])

    reason = _REASON_TEMPLATES.get(best_item["id"], f"Best match for your design intent")
    return {**best_item, "selection_reason": reason}
