import { parse } from "yaml";
import brandYaml from "../../brand.example.yaml?raw";
import { BrandTokensSchema, type BrandTokens } from "../schema/brand";

export const defaultBrand: BrandTokens = BrandTokensSchema.parse(parse(brandYaml));
