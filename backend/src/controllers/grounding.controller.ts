import { Request, Response, NextFunction } from 'express';
import { GroundingService } from '../services/grounding.service';

const groundingService = new GroundingService();

export const analyzePrompt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt } = req.body;

    if (prompt === undefined || prompt === null) {
      const error = new Error('Field "prompt" is required') as any;
      error.statusCode = 400;
      throw error;
    }

    const analysisResult = await groundingService.analyzePrompt(prompt);

    res.status(200).json(analysisResult);
  } catch (error) {
    next(error);
  }
};

export const generateResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt, assumptions, contextAnswers } = req.body;

    if (prompt === undefined || prompt === null) {
      const error = new Error('Field "prompt" is required') as any;
      error.statusCode = 400;
      throw error;
    }

    const generationResult = await groundingService.generateResponse(
      prompt,
      assumptions,
      contextAnswers
    );

    res.status(200).json(generationResult);
  } catch (error) {
    next(error);
  }
};

