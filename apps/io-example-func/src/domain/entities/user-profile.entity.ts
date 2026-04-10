import type { EmailAddress, FiscalCode } from "@pagopa/io-core-domain";

export interface UserProfile {
  readonly createdAt: string;
  readonly email: EmailAddress;
  readonly fiscalCode: FiscalCode;
  readonly name: string;
  readonly updatedAt?: string;
}
