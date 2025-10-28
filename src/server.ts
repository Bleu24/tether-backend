import { createApp } from "./app";
import { env } from "./config/env";

const { app, logger } = createApp();

app.listen(env.PORT, () => {
    logger.info(`🚀 Tether API ready on http://localhost:${env.PORT}`);
});
