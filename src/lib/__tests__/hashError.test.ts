import { describe, expect, it } from "vitest";
import { getHashErrorCode } from "@/lib/auth/hashError";

describe("getHashErrorCode", () => {
  it("extracts error_code from a GoTrue-style hash fragment", () => {
    const hash = "#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked";
    expect(getHashErrorCode(hash)).toBe("identity_already_exists");
  });

  it("works whether or not the leading # is included", () => {
    const hash = "error_code=identity_already_exists";
    expect(getHashErrorCode(hash)).toBe("identity_already_exists");
  });

  it("returns a different code for unrelated errors, not identity_already_exists", () => {
    const hash = "#error=server_error&error_code=otp_expired";
    expect(getHashErrorCode(hash)).toBe("otp_expired");
    expect(getHashErrorCode(hash)).not.toBe("identity_already_exists");
  });

  it("returns null when there is no hash", () => {
    expect(getHashErrorCode("")).toBeNull();
    expect(getHashErrorCode("#")).toBeNull();
  });

  it("returns null for a plain successful navigation with no error params", () => {
    expect(getHashErrorCode("#access_token=abc")).toBeNull();
  });
});
