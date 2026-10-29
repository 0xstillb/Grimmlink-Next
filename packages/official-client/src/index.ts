/** Phase02 owns the first implementation of an authenticated Official REST client. */
export class UpstreamDisabledError extends Error {
  override name = "UpstreamDisabledError";
}
export interface OfficialClient {
  getBookMetadata(bookId: string): Promise<never>;
}
export function createDisabledOfficialClient(): OfficialClient {
  return {
    getBookMetadata: async () => {
      throw new UpstreamDisabledError("Official REST connectivity is not authorized in Phase01");
    },
  };
}
