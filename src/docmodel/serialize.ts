import { parse, stringify } from "yaml";
import type { DocModel } from "../schema/docmodel";
import { canonicalize } from "./canonicalize";
import { YAML_PARSE_OPTIONS, YAML_STRINGIFY_OPTIONS } from "./yaml-config";

export function serializeDocModel(doc: DocModel): string {
  const canonical = canonicalize(doc);
  return stringify(canonical, YAML_STRINGIFY_OPTIONS);
}

export function parseDocModelYaml(source: string): unknown {
  return parse(source, YAML_PARSE_OPTIONS);
}
