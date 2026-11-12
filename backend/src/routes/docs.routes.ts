import { Router } from "express";
import swaggerUi from "swagger-ui-express";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

const docsRouter = Router();

// Localiza a especificação OpenAPI na raiz do backend.
const openApiPath = resolve(process.cwd(), "docs", "openapi.yaml");

// Lê e interpreta o arquivo YAML.
// `yaml@2.x` retorna `unknown`; `swaggerUi.setup` espera `JsonObject`.
// A asserção fica localizada — o parse em si já falha se o YAML for inválido.
type SwaggerDocument = Parameters<typeof swaggerUi.setup>[0];

const openApiDocument = parse(
  readFileSync(openApiPath, "utf-8"),
) as SwaggerDocument;

// Disponibiliza a interface interativa do Swagger.
docsRouter.use("/", swaggerUi.serve, swaggerUi.setup(openApiDocument));

export default docsRouter;