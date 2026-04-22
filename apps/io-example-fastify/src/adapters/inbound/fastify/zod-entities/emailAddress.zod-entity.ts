import { EmailAddress, fromValueObject } from "@pagopa/io-core-domain";
import { z } from "zod";

export const EmailAddressSchema = z
  .string()
  .pipe(fromValueObject(EmailAddress.create, "Invalid email address"));
