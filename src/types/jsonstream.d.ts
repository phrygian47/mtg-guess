declare module "JSONStream" {
  import { Transform } from "node:stream";

  const JSONStream: {
    parse(pattern: string): Transform;
  };

  export default JSONStream;
}
