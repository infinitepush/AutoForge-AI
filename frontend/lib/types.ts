export type VehicleType = "SUV" | "Sedan" | "Sports Car";

export type EngineType = "V6" | "V8" | "V12" | "EV Motor";
export type BatteryCapacity = 75 | 100 | 120;
export type ChassisLength = "short" | "standard" | "long";

export type VehicleConfiguration = {
  vehicle_type: VehicleType;
  powertrain: "EV" | "Hybrid" | "Petrol" | "Diesel";
  seats: number;
  style: string;
  color: string;
  paint_finish: "gloss" | "metallic" | "matte";
  wheel_style: "aero" | "sport" | "offroad" | "luxury";
  wheel_size: number;
  window_tint: number;
  trim_finish: "black" | "chrome" | "body";
  headlight_style: "matrix" | "signature" | "classic";
  upholstery: "black" | "tan" | "cream" | "alcantara";
  ambient_color: string;
  suspension: "standard" | "adaptive" | "air";
  terrain_mode: "road" | "sport" | "offroad";
  wheelbase: number;
  ground_clearance: number;
  // Performance specs
  engine_power: number;
  engine_torque: number;
  zero_to_sixty: number;
  drivetrain: "FWD" | "RWD" | "AWD" | "AWD permanent";
  // Engineering Digital Twin fields
  engine_type: EngineType;
  battery_capacity: BatteryCapacity;
  chassis_length: ChassisLength;
};

export type VehicleProject = {
  id: string;
  prompt: string;
  model: string;
  model_name: string;
  base_price: number;
  configuration: VehicleConfiguration;
  extraction_mode: string;
  selection_reason: string;
};

export type CatalogEntry = {
  id: string;
  name: string;
  vehicle_type: string;
  public_model: string;
  tags: string[];
  base_price: number;
};
