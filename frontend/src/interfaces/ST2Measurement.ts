// Single value from a NM ST2 endpoint, many other fields are returned, these are the only ones used at the moment
export interface ST2Measurement {
  result: number;
  resultTime: Date;
  phenomenonTime: Date;
}
