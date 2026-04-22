import { FiscalCode, fromValueObject } from "@pagopa/io-core-domain";
import { z } from "zod";

export const FiscalCodeSchema = z
  .string()
  .pipe(fromValueObject(FiscalCode.create, "Invalid Fiscal Code"));
