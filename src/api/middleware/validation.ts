import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

type ValidationDataProps = {
  schema: z.ZodTypeAny;
};

export function validateData({ schema }: ValidationDataProps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: any) => ({
          name: issue.path.join("."),
          messageError: issue.message,
        }));
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Invalid data", details: errorMessages });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ errors: [{ message: "Internal Server Error" }] });
      }
    }
  };
}
