import { DatabaseConfig, WhatsAppConfig, ViberConfig, TelegramConfig } from '../types';
export declare const config: {
    app: {
        name: string;
        version: string;
        environment: string;
        host: string;
        port: number;
        apiVersion: string;
        baseUrl: string;
    };
    security: {
        jwt: {
            secret: string;
            refreshSecret: string;
            expiresIn: string;
            refreshExpiresIn: string;
        };
        bcrypt: {
            rounds: number;
        };
        rateLimit: {
            windowMs: number;
            maxRequests: number;
        };
        cors: {
            enabled: boolean;
            origin: string[];
            credentials: boolean;
        };
        https: {
            force: boolean;
            hstsMaxAge: number;
        };
    };
    database: DatabaseConfig;
    integrations: {
        whatsapp: WhatsAppConfig;
        viber: ViberConfig;
        telegram: TelegramConfig;
        googleCloud: {
            projectId: string | undefined;
            keyFile: string | undefined;
        };
        azure: {
            textAnalyticsKey: string | undefined;
            textAnalyticsEndpoint: string | undefined;
        };
    };
    gdpr: {
        enabled: boolean;
        dpo: {
            email: string;
            phone: string;
            address: string;
        };
        dataRetention: {
            conversationMonths: number;
            businessDataMonths: number;
            analyticsMonths: number;
            auditLogMonths: number;
        };
        compliance: {
            autoDeleteExpiredData: boolean;
            consentRequiredForAnalytics: boolean;
            anonymizeExpiredData: boolean;
        };
        urls: {
            privacyPolicy: string;
            termsOfService: string;
            cookiePolicy: string;
            gdprContact: string;
        };
    };
    bulgarian: {
        businessRegistry: {
            apiUrl: string;
            apiKey: string | undefined;
        };
        sofiaTraffic: {
            apiUrl: string;
            apiKey: string | undefined;
        };
        holidays: {
            apiUrl: string;
            apiKey: string | undefined;
        };
        localization: {
            currency: string;
            locale: string;
            timezone: string;
        };
    };
    communication: {
        email: {
            sendgrid: {
                apiKey: string | undefined;
                fromEmail: string;
                fromName: string;
            };
        };
        sms: {
            twilio: {
                accountSid: string | undefined;
                authToken: string | undefined;
                phoneNumber: string | undefined;
            };
        };
        push: {
            fcm: {
                serverKey: string | undefined;
            };
            apns: {
                keyId: string | undefined;
                teamId: string | undefined;
            };
        };
    };
    features: {
        aiConversations: boolean;
        sofiaTrafficIntegration: boolean;
        certificationValidation: boolean;
        marketIntelligence: boolean;
        advancedAnalytics: boolean;
        swagger: boolean;
    };
    logging: {
        level: string;
        fileMaxSize: number;
        fileMaxFiles: number;
        gdprAuditRetentionYears: number;
    };
    upload: {
        maxFileSize: number;
        allowedTypes: string[];
        uploadPath: string;
    };
    cache: {
        ttlSeconds: number;
        maxKeys: number;
    };
    monitoring: {
        sentry: {
            dsn: string | undefined;
            environment: string | undefined;
        };
        analytics: {
            enabled: boolean;
            anonymizeIp: boolean;
            respectDnt: boolean;
        };
    };
};
export declare const validateGDPRConfig: () => boolean;
export declare const validateDatabaseConfig: () => boolean;
export declare const initializeConfig: () => void;
export default config;
//# sourceMappingURL=config.d.ts.map