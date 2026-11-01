import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.port, () => {
  console.log(
    `InfraMap API executando na porta ${env.port}`
  );

  console.log(`Ambiente: ${env.nodeEnv}`);
});