const express = require("express");
const axios = require("axios");

const router = express.Router();

const proxyRequest = async (req, res) => {
  const { url, method, headers, body, apiKey } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL is required",
    });
  }

  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Invalid URL format",
    });
  }

  const requestHeaders = { ...headers };
  let finalUrl = url;
  const urlObj = new URL(url);

  const isGemini = url.includes("generativelanguage.googleapis.com");
  const isReplicate = url.includes("api.replicate.com");
  const isCohere = url.includes("api.cohere.ai");
  const isAnthropic = url.includes("api.anthropic.com");
  const isOpenAI = url.includes("api.openai.com");
  const isDeepSeek = url.includes("api.deepseek.com");
  const isMistral = url.includes("api.mistral.ai");
  const isGroq = url.includes("api.groq.com");
  const isPerplexity = url.includes("api.perplexity.ai");
  const isTogether = url.includes("api.together.xyz");

  if (apiKey) {
    if (isGemini) {
      urlObj.searchParams.set("key", apiKey);
      finalUrl = urlObj.toString();
    } else if (isReplicate) {
      requestHeaders["Authorization"] = `Token ${apiKey}`;
    } else if (isCohere) {
      requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    } else if (isAnthropic) {
      requestHeaders["x-api-key"] = apiKey;
      if (!requestHeaders["anthropic-version"]) {
        requestHeaders["anthropic-version"] = "2023-06-01";
      }
    } else if (isOpenAI || isDeepSeek || isMistral || isGroq || isPerplexity || isTogether) {
      requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    } else {
      requestHeaders["Authorization"] = `Bearer ${apiKey}`;
    }
  }

  const config = {
    method: method.toLowerCase(),
    url: finalUrl,
    headers: requestHeaders,
    timeout: parseInt(process.env.TIMEOUT) || 60000,
    validateStatus: (status) => true,
  };

  if (["post", "put", "patch"].includes(method.toLowerCase()) && body) {
    try {
      if (typeof body === "string") {
        config.data = JSON.parse(body);
      } else {
        config.data = body;
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid JSON in request body",
      });
    }
  }

  const startTime = Date.now();

  try {
    const response = await axios(config);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const responseSize = JSON.stringify(response.data).length;

    res.json({
      success: true,
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      responseTime: responseTime,
      responseSize: responseSize,
    });
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let errorMessage = "Request failed";
    let statusCode = 500;

    if (error.code === "ECONNABORTED") {
      errorMessage = "Request timeout - The service took too long to respond";
      statusCode = 408;
    } else if (error.code === "ENOTFOUND") {
      errorMessage = "Server not found. Please check the URL";
      statusCode = 404;
    } else if (error.code === "ECONNREFUSED") {
      errorMessage = "Connection refused. Server may be down";
      statusCode = 503;
    } else if (error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.statusText || "Server error";

      if (isGemini && error.response.data?.error) {
        const geminiError = error.response.data.error;
        if (geminiError.code === 401 || geminiError.status === "UNAUTHENTICATED") {
          errorMessage = "Invalid Gemini API key. Please check your API key (should start with 'AIza') and try again.";
        } else if (geminiError.code === 403) {
          errorMessage = "Gemini API key doesn't have permission. Please enable billing in Google Cloud Console.";
        } else if (geminiError.code === 429) {
          errorMessage = "Gemini API rate limit exceeded. Please wait and try again.";
        } else if (geminiError.message) {
          errorMessage = `Gemini Error: ${geminiError.message}`;
        }
      } else if (isAnthropic && error.response.data?.error) {
        const anthropicError = error.response.data.error;
        if (anthropicError.type === "authentication_error") {
          errorMessage = "Invalid Anthropic API key. Please check your API key.";
        } else if (anthropicError.message) {
          errorMessage = `Anthropic Error: ${anthropicError.message}`;
        }
      } else if (isCohere && error.response.data?.message) {
        errorMessage = `Cohere Error: ${error.response.data.message}`;
      } else if (isOpenAI && error.response.data?.error?.message) {
        errorMessage = `OpenAI Error: ${error.response.data.error.message}`;
      } else if (isDeepSeek && error.response.data?.error?.message) {
        errorMessage = `DeepSeek Error: ${error.response.data.error.message}`;
      } else if (error.response.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }

      return res.json({
        success: false,
        error: errorMessage,
        status: statusCode,
        data: error.response.data,
        headers: error.response.headers,
        responseTime: responseTime,
      });
    } else if (error.request) {
      errorMessage = "No response from server. The service might be down.";
    } else {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      responseTime: responseTime,
    });
  }
};

router.post("/proxy", proxyRequest);

module.exports = router;