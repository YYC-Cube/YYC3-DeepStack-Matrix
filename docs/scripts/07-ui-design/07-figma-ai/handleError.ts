// /utils/error-handler.ts

interface ErrorOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
}

function handleError(error: Error, options: ErrorOptions = {}) {
  const {
    showToast = true,
    logToConsole = true,
    logToServer = false,
  } = options;

  if (logToConsole) {
    console.error(error);
  }

  if (logToServer) {
    logErrorToServer(error);
  }

  if (showToast) {
    showToastMessage(error.message);
  }
}

// 使用示例：
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    logToConsole: true,
    logToServer: true,
  });
}
