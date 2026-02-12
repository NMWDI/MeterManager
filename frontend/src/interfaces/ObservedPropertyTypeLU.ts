import type { Unit } from "./Unit";

export interface ObservedPropertyTypeLU {
  id: number;
  name: string;
  description: string;
  context: string;

  units?: Unit[];
}
