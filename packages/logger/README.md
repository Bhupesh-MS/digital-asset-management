# @dam/logger

Shared logging utility for the DAM platform.

This package provides a standardized logging format (e.g., using Winston or a custom logger) across all microservices and apps.

## Usage

Import the logger into your service:

```typescript
import { logger } from "@dam/logger";

logger.info("Service started");
```
