package com.blerelay.gemma

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * React Native bridge module for Gemma LLM inference
 * Exposes native functionality to JavaScript
 */
class GemmaModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "GemmaModule"
        private const val EVENT_PARTIAL_RESULT = "onGemmaPartialResult"
        private const val EVENT_GENERATION_COMPLETE = "onGemmaGenerationComplete"
        private const val EVENT_GENERATION_ERROR = "onGemmaGenerationError"
    }

    private var gemmaEngine: GemmaInferenceEngine? = null
    private val moduleScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun getName(): String = "GemmaModule"

    /**
     * Get exported constants
     */
    override fun getConstants(): MutableMap<String, Any> {
        return hashMapOf(
            "EVENT_PARTIAL_RESULT" to EVENT_PARTIAL_RESULT,
            "EVENT_GENERATION_COMPLETE" to EVENT_GENERATION_COMPLETE,
            "EVENT_GENERATION_ERROR" to EVENT_GENERATION_ERROR
        )
    }

    /**
     * Initialize the Gemma model from a file path
     * @param modelPath Absolute path to the .litertlm model file
     */
    @ReactMethod
    fun initializeModel(modelPath: String, promise: Promise) {
        moduleScope.launch(Dispatchers.IO) {
            try {
                Log.d(TAG, "Initializing Gemma model from: $modelPath")
                
                if (gemmaEngine == null) {
                    gemmaEngine = GemmaInferenceEngine(reactContext)
                }
                
                gemmaEngine!!.initialize(modelPath)

                val info = gemmaEngine!!.getModelInfo()
                val result = Arguments.createMap().apply {
                    putString("status", "success")
                    putString("message", "Model initialized successfully")
                    putString("modelPath", info["modelPath"] as String)
                    putInt("maxTokens", info["maxTokens"] as Int)
                    putDouble("temperature", (info["temperature"] as? Number)?.toDouble() ?: 0.0)
                    putInt("topK", info["topK"] as Int)
                    putDouble("topP", (info["topP"] as? Number)?.toDouble() ?: 0.0)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error initializing model", e)
                promise.reject("INIT_FAILED", e.message ?: "Unknown error during initialization", e)
            }
        }
    }

    /**
     * Generate response with streaming tokens
     * Emits partial results via events
     * @param prompt Input text prompt
     */
    @ReactMethod
    fun generateResponse(prompt: String, promise: Promise) {
        if (gemmaEngine == null || !gemmaEngine!!.isModelInitialized()) {
            promise.reject(
                "NOT_INITIALIZED",
                "Model not initialized. Call initializeModel() first."
            )
            return
        }

        moduleScope.launch(Dispatchers.IO) {
            try {
                Log.d(TAG, "Generating response for prompt: ${prompt.take(50)}...")
                
                var fullResponse = ""
                
                gemmaEngine!!.generateResponseAsync(prompt) { partialText, isDone ->
                    // Update full response
                    if (!isDone) {
                        fullResponse += partialText
                    }
                    
                    // Send event to React Native
                    val params = Arguments.createMap().apply {
                        putString("text", partialText)
                        putBoolean("isDone", isDone)
                        putString("fullText", fullResponse)
                    }
                    
                    sendEvent(EVENT_PARTIAL_RESULT, params)
                    
                    // Resolve promise when complete
                    if (isDone) {
                        promise.resolve(fullResponse)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error generating response", e)
                
                // Send error event
                val errorParams = Arguments.createMap().apply {
                    putString("error", e.message ?: "Unknown error")
                }
                sendEvent(EVENT_GENERATION_ERROR, errorParams)
                
                promise.reject("GENERATION_ERROR", e.message ?: "Unknown error")
            }
        }
    }

    /**
     * Reset the conversation (clear chat history)
     */
    @ReactMethod
    fun resetConversation(promise: Promise) {
        if (gemmaEngine == null || !gemmaEngine!!.isModelInitialized()) {
            promise.reject("NOT_INITIALIZED", "Model not initialized")
            return
        }

        moduleScope.launch(Dispatchers.IO) {
            try {
                val success = gemmaEngine!!.resetConversation()
                if (success) {
                    promise.resolve("Conversation reset successfully")
                } else {
                    promise.reject("ERROR", "Failed to reset conversation")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error resetting conversation", e)
                promise.reject("ERROR", e.message ?: "Unknown error")
            }
        }
    }

    /**
     * Check if model is initialized
     */
    @ReactMethod
    fun isInitialized(promise: Promise) {
        try {
            val isInit = gemmaEngine?.isModelInitialized() ?: false
            promise.resolve(isInit)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Get model information
     */
    @ReactMethod
    fun getModelInfo(promise: Promise) {
        try {
            if (gemmaEngine == null) {
                val result = Arguments.createMap().apply {
                    putBoolean("isInitialized", false)
                }
                promise.resolve(result)
                return
            }

            val info = gemmaEngine!!.getModelInfo()
            val result = Arguments.createMap().apply {
                putBoolean("isInitialized", info["isInitialized"] as Boolean)
                putString("modelPath", info["modelPath"] as String)
                putInt("maxTokens", info["maxTokens"] as Int)
                putDouble("temperature", (info["temperature"] as? Number)?.toDouble() ?: 0.0)
                putInt("topK", info["topK"] as Int)
                putDouble("topP", (info["topP"] as? Number)?.toDouble() ?: 0.0)
                putString("library", info["library"] as String)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting model info", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Close and cleanup the model
     */
    @ReactMethod
    fun closeModel(promise: Promise) {
        try {
            gemmaEngine?.close()
            gemmaEngine = null
            promise.resolve("Model closed successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error closing model", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }

    /**
     * Send event to React Native
     */
    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Cleanup on module destroy
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        gemmaEngine?.close()
        gemmaEngine = null
    }
}

