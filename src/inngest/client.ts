// src/inngest/client.ts
import { Inngest, EventSchemas } from "inngest";

// Define all events with their payload types
type Events = {
  "document.uploaded": {
    data: {
      documentId: string;
      userId: string;
    };
  };
  "document.extracted": {
    data: {
      documentId: string;
      pageCount: number;
      isPartial?: boolean;
      extractedPages?: number;
      expectedPages?: number;
    };
  };
  "document.analysis.requested": {
    data: {
      documentId: string;
      analysisType: "findings" | "comparison";
      compareToDocumentId?: string;
    };
  };
  "document.failed": {
    data: {
      documentId: string;
      error: string;
      retryable: boolean;
    };
  };
};

export const inngest = new Inngest({
  id: "iep-copilot",
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type InngestEvents = Events;
