export const MESSAGE_TYPES = Object.freeze({
  getPublicState: "GET_PUBLIC_STATE",
  getOptionsState: "GET_OPTIONS_STATE",
  saveConfiguration: "SAVE_CONFIGURATION",
  testConfiguration: "TEST_CONFIGURATION",
  refreshNow: "REFRESH_NOW",
  deleteApiKey: "DELETE_API_KEY",
  clearLocalData: "CLEAR_LOCAL_DATA",
});

export const successResponse = (data = null) => ({ ok: true, data });
export const errorResponse = (error) => ({ ok: false, error });
