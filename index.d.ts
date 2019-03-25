// Type definitions for google-assistant v0.5.3
type ConversationEventType = "end-of-utterance" | "transcription" | "audio-data" | "device-action" | "response" | "volume-percent" | "screen-data" | "error" | "ended";
type AssistantEventType = "ready" | "error" | "started";
type ConversationHandlerCallback = () => void;

declare class Assistant {
    converse(): GoogleAssistant.Conversation;
}

declare namespace GoogleAssistant {
    namespace Config {
        export type AudioConfig = {
            encodingOut?: "LINEAR16" | "MP3" | "OPUS_IN_OGG";
            sampleRateOut?: number;
            encodingIn?: "LINEAR16" | "FLAC";
            sampleRateIn?: number;
        };

        export type ScreenConfig = { isOn: boolean };

        export type AuthConfig = {
            keyFilePath: string;
            savedTokensPath: string;
            tokenInput?(processTokens: any): void;
        };

        export type ConversationConfig = {
            audio?: AudioConfig;
            textQuery?: string;
            deviceId?: string;
            deviceModelId?: string;
            lang?: string;
            isNew?: boolean;
            deviceLocation?: DeviceLocationConfig;
            screen?: ScreenConfig;
        };

        export type DeviceLocationConfig = {
            coordinates: { latitude: number; longitude: number };
        };
    }

    class AssistantEventEmitter {
        private emit(type: AssistantEventType, payload?: any): any;
        on(type: "ready", handler: (assistant: GoogleAssistant) => void): GoogleAssistant;
        on(type: "started", handler: (conversation: Conversation, assistant: GoogleAssistant) => void): GoogleAssistant;
        on(type: "error", handler: (error: Error) => void): GoogleAssistant;
        on(type: AssistantEventType, handler: (value: any) => void): GoogleAssistant;
    }

    class ConversationEventEmitter {
        private emit(type: ConversationEventType, payload?: any): any;
        on(type: "ended", handler: (error: Error, continueConversation: boolean) => void): Conversation;
        on(type: "volume-percent", handler: (percent: number) => void): Conversation;
        on(type: "audio-data", handler: (audioData: any) => void): Conversation;
        on(type: "transcription", handler: (transcript: { transcription: string, done: boolean }) => void): Conversation;
        on(type: "error", handler: (error: Error) => void): Conversation;
        on(type: AssistantEventType, handler: (value: any) => void): Conversation;
    }

    export class Conversation extends ConversationEventEmitter {
        constructor(config: Config.ConversationConfig);
        write(bytes: Uint8Array): void;
        end(): void;
    }

    export class GoogleAssistant extends AssistantEventEmitter {
        constructor(
            authConfig: Config.AuthConfig,
            callback?: (callbackArg: Assistant | Error) => void
        );

        start(
            conversation?: Config.ConversationConfig,
            callback?: (callbackArg: Conversation | Error) => void
        ): void;
    }

}

export = GoogleAssistant;
