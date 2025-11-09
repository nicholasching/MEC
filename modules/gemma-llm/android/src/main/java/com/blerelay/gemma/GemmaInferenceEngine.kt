package com.blerelay.gemma

import android.content.Context
import android.util.Log
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Content
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.LiteRtLmJniException
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.MessageCallback
import com.google.ai.edge.litertlm.SamplerConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.util.concurrent.CancellationException

/**
 * Core LLM inference engine using Google's LiteRT-LM library
 * Handles model loading, text generation, and resource management
 * 
 * Based on Google's official Gallery app implementation:
 * https://github.com/google-ai-edge/gallery
 */
class GemmaInferenceEngine(private val context: Context) {
    companion object {
        private const val TAG = "GemmaInferenceEngine"
        private const val MAX_TOKENS = 1024
        private const val TEMPERATURE = 0.8
        private const val TOP_K = 50
        private const val TOP_P = 0.95
        private const val IMPORTS_DIR = "__imports"
    }

    private var engine: Engine? = null
    private var conversation: Conversation? = null
    private var isInitialized = false
    private var modelPath: String? = null

    /**
     * Initialize the LLM engine from a file path
     * @param modelFilePath Absolute file path to the .litertlm model file
     * @return true if initialization successful, false otherwise
     */
    suspend fun initialize(modelFilePath: String): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            Log.d(TAG, "🚀 Initializing Gemma model from: $modelFilePath")

            // Sanitize and make sure the model file is located where LiteRT-LM expects it
            val sanitizedPath = sanitizeModelPath(modelFilePath)
            val accessiblePath = ensureModelFileAccessible(sanitizedPath)

            Log.d(TAG, "📍 Using model path: $accessiblePath")

            val modelFile = File(accessiblePath)
            if (!modelFile.exists()) {
                Log.e(TAG, "❌ File does not exist at: $accessiblePath")
                logParentDirectory(accessiblePath)
                throw IllegalStateException("Model file not found at: $accessiblePath")
            }

            val fileSizeMB = modelFile.length() / (1024 * 1024)
            Log.d(TAG, "📦 Model file size: ${fileSizeMB}MB")

            // Close existing instance if any
            close()

            // Try GPU first, then fall back to CPU if that fails
            engine = tryInitializeEngine(accessiblePath, Backend.GPU)
                ?: tryInitializeEngine(accessiblePath, Backend.CPU)
                ?: throw IllegalStateException("Engine is not initialized.")

            // Create a conversation with sampling parameters
            Log.d(TAG, "💬 Creating conversation...")
            conversation = engine!!.createConversation(
                ConversationConfig(
                    samplerConfig = SamplerConfig(
                        topK = TOP_K,
                        topP = TOP_P,
                        temperature = TEMPERATURE
                    )
                )
            )

            modelPath = accessiblePath
            isInitialized = true

            Log.d(TAG, "✅ Gemma model initialized successfully")
            Log.d(TAG, "🎛️ Config: maxTokens=$MAX_TOKENS, temp=$TEMPERATURE, topK=$TOP_K, topP=$TOP_P")

            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to initialize Gemma model", e)
            Log.e(TAG, "Error details: ${e.message}")
            Log.e(TAG, "Stack trace: ${e.stackTraceToString()}")
            isInitialized = false
            throw e
        }
    }

    private fun sanitizeModelPath(modelFilePath: String): String {
        return if (modelFilePath.startsWith("file://")) {
            modelFilePath.substring(7)
        } else {
            modelFilePath
        }
    }

    private fun ensureModelFileAccessible(originalPath: String): String {
        val originalFile = File(originalPath)
        val externalDir = context.getExternalFilesDir(null) ?: return originalPath

        val importsDir = File(externalDir, IMPORTS_DIR)
        if (!importsDir.exists()) {
            importsDir.mkdirs()
        }

        val targetFile = File(importsDir, originalFile.name)

        if (originalFile.absolutePath == targetFile.absolutePath) {
            return targetFile.absolutePath
        }

        // If the target file already exists and matches size, reuse it
        if (targetFile.exists() && targetFile.length() == originalFile.length()) {
            Log.d(TAG, "📦 Reusing existing copy at ${targetFile.absolutePath}")
            return targetFile.absolutePath
        }

        return try {
            Log.d(TAG, "📂 Copying model to external storage: ${targetFile.absolutePath}")
            originalFile.copyTo(targetFile, overwrite = true)
            targetFile.absolutePath
        } catch (copyError: IOException) {
            Log.e(TAG, "❌ Failed to copy model file. Using original path.", copyError)
            originalPath
        }
    }

    private fun tryInitializeEngine(modelPath: String, backend: Backend): Engine? {
        return try {
            Log.d(TAG, "⚙️ Creating LiteRT-LM engine configuration with backend: $backend")
            val engineConfig = EngineConfig(
                modelPath = modelPath,
                backend = backend,
                visionBackend = null,
                audioBackend = null,
                maxNumTokens = MAX_TOKENS,
                cacheDir = if (modelPath.startsWith("/data/local/tmp"))
                    context.getExternalFilesDir(null)?.absolutePath
                else null
            )

            val newEngine = Engine(engineConfig)
            newEngine.initialize()
            Log.d(TAG, "✅ Engine initialized with backend: $backend")
            newEngine
        } catch (liteRtError: LiteRtLmJniException) {
            Log.w(TAG, "⚠️ Engine initialization failed for backend $backend", liteRtError)
            null
        }
    }

    private fun logParentDirectory(path: String) {
        try {
            val parentDir = File(path).parentFile ?: return
            if (!parentDir.exists()) {
                Log.e(TAG, "Parent directory does not exist: ${parentDir.absolutePath}")
                return
            }
            Log.e(TAG, "Contents of parent directory (${parentDir.absolutePath}):")
            parentDir.listFiles()?.forEach { file ->
                Log.e(TAG, "  - ${file.name} (${file.length() / (1024 * 1024)}MB)")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to list parent directory", e)
        }
    }

    /**
     * Generate response with streaming tokens using LiteRT-LM Conversation API
     * @param prompt Input text prompt
     * @param onPartialResult Callback for each generated token
     * @return Complete generated text
     */
    suspend fun generateResponseAsync(
        prompt: String,
        onPartialResult: (String, Boolean) -> Unit
    ): String = withContext(Dispatchers.IO) {
        if (!isInitialized || conversation == null) {
            Log.e(TAG, "Model not initialized")
            onPartialResult("Error: Model not initialized", true)
            return@withContext "Error: Model not initialized"
        }

        return@withContext try {
            Log.d(TAG, "💬 Generating response for prompt: ${prompt.take(100)}...")

            val startTime = System.currentTimeMillis()
            val fullResponse = StringBuilder()

            // Send message asynchronously with streaming callback
            conversation!!.sendMessageAsync(
                Message.of(listOf(Content.Text(prompt))),
                object : MessageCallback {
                    override fun onMessage(message: Message) {
                        // Extract text from message contents
                        message.contents.filterIsInstance<Content.Text>().forEach { textContent ->
                            fullResponse.append(textContent.text)
                            onPartialResult(textContent.text, false)
                        }
                    }

                    override fun onDone() {
                        val duration = System.currentTimeMillis() - startTime
                        val response = fullResponse.toString()
                        val tokensPerSecond = if (duration > 0 && response.isNotEmpty()) {
                            (response.split(" ").size * 1000.0 / duration)
                        } else 0.0

                        Log.d(TAG, "✅ Generation complete")
                        Log.d(TAG, "📝 Response length: ${response.length} chars")
                        Log.d(TAG, "⏱️ Duration: ${duration}ms")
                        Log.d(TAG, "⚡ Speed: ${"%.2f".format(tokensPerSecond)} tokens/sec")

                        onPartialResult("", true)
                    }

                    override fun onError(throwable: Throwable) {
                        if (throwable is CancellationException) {
                            Log.i(TAG, "The inference was cancelled")
                            onPartialResult("", true)
                        } else {
                            Log.e(TAG, "Error during generation", throwable)
                            val errorMsg = "Error: ${throwable.message}"
                            onPartialResult(errorMsg, true)
                        }
                    }
                }
            )

            // Wait for completion and return the full response
            fullResponse.toString()
        } catch (e: Exception) {
            val errorMsg = "Error generating response: ${e.message}"
            Log.e(TAG, "❌ $errorMsg", e)
            onPartialResult(errorMsg, true)
            errorMsg
        }
    }

    /**
     * Reset the conversation (clear chat history)
     */
    suspend fun resetConversation(): Boolean = withContext(Dispatchers.IO) {
        return@withContext try {
            if (!isInitialized || engine == null) {
                return@withContext false
            }

            Log.d(TAG, "🔄 Resetting conversation...")

            // Close old conversation
            conversation?.close()

            // Create new conversation with same parameters
            conversation = engine!!.createConversation(
                ConversationConfig(
                    samplerConfig = SamplerConfig(
                        topK = TOP_K,
                        topP = TOP_P,
                        temperature = TEMPERATURE
                    )
                )
            )

            Log.d(TAG, "✅ Conversation reset successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to reset conversation", e)
            false
        }
    }

    /**
     * Check if model is initialized
     */
    fun isModelInitialized(): Boolean = isInitialized

    /**
     * Get the current model path
     */
    fun getModelPath(): String? = modelPath

    /**
     * Get model information
     */
    fun getModelInfo(): Map<String, Any> {
        return mapOf(
            "isInitialized" to isInitialized,
            "modelPath" to (modelPath ?: "N/A"),
            "maxTokens" to MAX_TOKENS,
            "temperature" to TEMPERATURE,
            "topK" to TOP_K,
            "topP" to TOP_P,
            "library" to "LiteRT-LM"
        )
    }

    /**
     * Close and cleanup resources
     */
    fun close() {
        try {
            conversation?.close()
            conversation = null
            
            engine?.close()
            engine = null
            
            isInitialized = false
            Log.d(TAG, "✅ Gemma model closed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error closing model", e)
        }
    }
}
