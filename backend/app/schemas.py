from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class VehicleType(str, Enum):
    SUV = "SUV"
    SEDAN = "Sedan"
    SPORTS = "Sports Car"


class VehicleConfiguration(BaseModel):
    vehicle_type: VehicleType
    powertrain: Literal["EV", "Hybrid", "Petrol", "Diesel"] = "EV"
    seats: int = Field(default=4, ge=2, le=7)
    style: str = "modern"
    color: str = "#192c46"
    paint_finish: Literal["gloss", "metallic", "matte"] = "metallic"
    wheel_style: Literal["aero", "sport", "offroad", "luxury"] = "sport"
    wheel_size: int = Field(default=21, ge=18, le=23)
    window_tint: int = Field(default=35, ge=0, le=90)
    trim_finish: Literal["black", "chrome", "body"] = "black"
    headlight_style: Literal["matrix", "signature", "classic"] = "matrix"
    upholstery: Literal["black", "tan", "cream", "alcantara"] = "black"
    ambient_color: str = "#ff5a3c"
    suspension: Literal["standard", "adaptive", "air"] = "adaptive"
    terrain_mode: Literal["road", "sport", "offroad"] = "road"
    wheelbase: int = Field(default=2850, ge=2400, le=3300)
    ground_clearance: int = Field(default=170, ge=100, le=300)
    # Performance specs — derived from powertrain + vehicle type
    engine_power: int = Field(default=300, ge=100, le=1200, description="Peak power in hp")
    engine_torque: int = Field(default=420, ge=150, le=1500, description="Peak torque in Nm")
    zero_to_sixty: float = Field(default=5.1, ge=1.5, le=12.0, description="0-60 mph in seconds")
    drivetrain: Literal["FWD", "RWD", "AWD", "AWD permanent"] = "AWD"
    engine_type: Literal["V6", "V8", "V12", "EV Motor"] = "EV Motor"
    battery_capacity: Literal[75, 100, 120] = 75
    chassis_length: Literal["short", "standard", "long"] = "standard"


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=1000)


class VehicleProjectResponse(BaseModel):
    id: str
    prompt: str
    model: str
    model_name: str
    base_price: int
    configuration: VehicleConfiguration
    extraction_mode: str
    selection_reason: str = ""


class VehicleUpdateRequest(BaseModel):
    id: str
    configuration: VehicleConfiguration

