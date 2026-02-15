import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Процент трассировки (10% в продакшене для экономии)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Включить replay сессий только если DSN задан
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
        Sentry.replayIntegration(),
    ],

    // Не инициализировать если DSN не задан
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    debug: false,
});
