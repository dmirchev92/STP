import { Request, Response } from 'express';
export declare const createCase: (req: Request, res: Response) => Promise<void>;
export declare const getProviderCases: (req: Request, res: Response) => Promise<void>;
export declare const acceptCase: (req: Request, res: Response) => Promise<void>;
export declare const declineCase: (req: Request, res: Response) => Promise<void>;
export declare const getAvailableCases: (req: Request, res: Response) => Promise<void>;
export declare const completeCase: (req: Request, res: Response) => Promise<void>;
export declare const getCasesWithFilters: (req: Request, res: Response) => Promise<void>;
export declare const getCaseStats: (req: Request, res: Response) => Promise<void>;
export declare const getSmartMatches: (req: Request, res: Response) => Promise<void>;
export declare const autoAssignCase: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=caseController.d.ts.map