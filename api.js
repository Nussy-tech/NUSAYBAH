window.CODELOKAL_API_URL = window.CODELOKAL_API_URL || `${window.location.origin}/api`;

async function requestCodeLokalApi(method, endpoint, payload) {
  const baseUrl = (window.CODELOKAL_API_URL || "").replace(/\/$/, "");

  if (!baseUrl) {
    return {
      ok: false,
      fallback: true,
      message: "API URL is not configured yet. Data will stay in local storage."
    };
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      he aders: {
        "Content-Type": "application/json"
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return { ok: true, fallback: false, data };
  } catch (error) {
    return {
      ok: false,
      fallback: true,
      message: error.message || "Unable to reach the API."
    };
  }
}

async function sendToCodeLokalApi(endpoint, payload) {
  return requestCodeLokalApi("POST", endpoint, payload);
}

async function getFromCodeLokalApi(endpoint) {
  return requestCodeLokalApi("GET", endpoint);
}
