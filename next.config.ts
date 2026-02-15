import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Тихая сборка без лишних логов
  silent: true,

  // Не загружать source maps если нет auth token
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Расширить загрузку клиентских файлов
  widenClientFileUpload: true,

  // Отключить логгер Sentry
  disableLogger: true,
});
