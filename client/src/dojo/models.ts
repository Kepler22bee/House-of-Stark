export interface Position {
  fieldOrder: string[];
  player: string;
  x: number;
  y: number;
}

export interface SchemaType {
  [namespace: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [model: string]: { [field: string]: any };
  };
  starter: {
    Position: Position;
  };
}

export const schema: SchemaType = {
  starter: {
    Position: { fieldOrder: ["player", "x", "y"], player: "", x: 0, y: 0 },
  },
};

export enum ModelsMapping {
  Position = "starter-Position",
  Moved = "starter-Moved",
}
