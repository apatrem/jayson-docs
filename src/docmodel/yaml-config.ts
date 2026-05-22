import type { ParseOptions, ToStringOptions } from "yaml";

export const YAML_STRINGIFY_OPTIONS: ToStringOptions = {
  indent: 2,
  indentSeq: true,
  lineWidth: 100,
  minContentWidth: 20,
  doubleQuotedAsJSON: false,
  doubleQuotedMinMultiLineLength: 80,
  singleQuote: false,
  defaultStringType: "PLAIN",
  defaultKeyType: "PLAIN",
  blockQuote: "literal",
  trueStr: "true",
  falseStr: "false",
  nullStr: "null",
  collectionStyle: "block",
  flowCollectionPadding: false,
  simpleKeys: true,
  directives: false,
};

export const YAML_PARSE_OPTIONS: ParseOptions = {
  prettyErrors: true,
  strict: true,
  uniqueKeys: true,
};
