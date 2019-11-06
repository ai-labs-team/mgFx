export type Serializable =
  | boolean
  | number
  | string
  | null
  | SerializableObject
  | SerializableArray

export interface SerializableObject {
  [key: string]: Serializable
}

export interface SerializableArray extends Array<Serializable> { }
