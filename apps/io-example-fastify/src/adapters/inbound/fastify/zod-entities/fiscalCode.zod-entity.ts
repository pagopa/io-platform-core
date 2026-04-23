import { FiscalCode, fromValueObject } from "@pagopa/io-core-domain";
import { z } from "zod";

export const FiscalCodeSchema = z
  // Decode from channel layer as string
  .string()
  //  then transform to FiscalCode using fromValueObject
  .pipe(fromValueObject(FiscalCode.create, "Invalid Fiscal Code"));
