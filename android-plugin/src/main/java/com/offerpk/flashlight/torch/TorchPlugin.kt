package com.offerpk.flashlight.torch

import android.content.Context
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor Torch plugin scaffold.
 *
 * Uses CameraManager.setTorchMode (API 23+) without opening a capture session.
 * On API 33+ / Android 13+, prefers turnOnTorchWithStrengthLevel when available.
 *
 * Wire-up:
 *  1. Copy this class into your Capacitor Android app (or local plugin module).
 *  2. Register in MainActivity / capacitor plugins as "Torch".
 *  3. AndroidManifest: CAMERA permission if required by OEM; uses-feature camera/flash required=false.
 *  4. Handle TorchCallback / availability — camera in use → reject with "camera-in-use".
 *
 * NO location / mic / storage / contacts.
 */
@CapacitorPlugin(name = "Torch")
class TorchPlugin : Plugin() {

    private var cameraId: String? = null
    private var torchCallback: CameraManager.TorchCallback? = null
    private var torchAvailable: Boolean = false
    private var strengthSupported: Boolean = false
    private var maxStrength: Int = 1

    override fun load() {
        super.load()
        val cm = cameraManager() ?: return
        cameraId = findFlashCameraId(cm)
        strengthSupported = Build.VERSION.SDK_INT >= 33 && cameraId != null
        if (strengthSupported && cameraId != null) {
            try {
                val chars = cm.getCameraCharacteristics(cameraId!!)
                // API 33+: FLASH_INFO_STRENGTH_MAXIMUM_LEVEL
                val key = CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL
                maxStrength = chars.get(key) ?: 1
                if (maxStrength <= 1) strengthSupported = false
            } catch (_: Exception) {
                strengthSupported = false
            }
        }
        registerTorchCallback(cm)
    }

    override fun handleOnDestroy() {
        unregisterTorchCallback()
        tryTurnOff()
        super.handleOnDestroy()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val ret = JSObject()
        val id = cameraId
        val available = id != null && torchAvailable
        ret.put("available", available)
        ret.put("strengthSupported", strengthSupported)
        ret.put("maxStrength", maxStrength)
        if (id == null) ret.put("reason", "no-flash-camera")
        else if (!torchAvailable) ret.put("reason", "torch-unavailable")
        call.resolve(ret)
    }

    @PluginMethod
    fun turnOn(call: PluginCall) {
        setTorch(true, null, call)
    }

    @PluginMethod
    fun turnOnWithStrength(call: PluginCall) {
        val level = call.getFloat("level", 1f) ?: 1f
        setTorch(true, level.coerceIn(0f, 1f), call)
    }

    @PluginMethod
    fun turnOff(call: PluginCall) {
        setTorch(false, null, call)
    }

    private fun setTorch(on: Boolean, strength01: Float?, call: PluginCall) {
        val cm = cameraManager()
        val id = cameraId
        if (cm == null || id == null) {
            call.reject("no-flash-camera")
            return
        }
        if (!torchAvailable && on) {
            call.reject("camera-in-use-or-unavailable")
            return
        }
        try {
            if (on && strengthSupported && strength01 != null && Build.VERSION.SDK_INT >= 33) {
                val level = (strength01 * maxStrength).toInt().coerceIn(1, maxStrength)
                // CameraManager.turnOnTorchWithStrengthLevel(String, int) — API 33+
                cm.turnOnTorchWithStrengthLevel(id, level)
            } else {
                cm.setTorchMode(id, on)
            }
            val ret = JSObject()
            ret.put("on", on)
            if (strength01 != null) ret.put("strength", strength01.toDouble())
            call.resolve(ret)
        } catch (e: Exception) {
            val msg = e.message ?: "torch-error"
            if (msg.contains("in use", ignoreCase = true) || msg.contains("CameraInUse", ignoreCase = true)) {
                call.reject("camera-in-use")
            } else {
                call.reject(msg)
            }
        }
    }

    private fun tryTurnOff() {
        try {
            val cm = cameraManager() ?: return
            val id = cameraId ?: return
            cm.setTorchMode(id, false)
        } catch (_: Exception) {
        }
    }

    private fun cameraManager(): CameraManager? {
        return context.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
    }

    private fun findFlashCameraId(cm: CameraManager): String? {
        return try {
            cm.cameraIdList.firstOrNull { id ->
                val c = cm.getCameraCharacteristics(id)
                val flash = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
                val facing = c.get(CameraCharacteristics.LENS_FACING)
                flash && facing == CameraCharacteristics.LENS_FACING_BACK
            } ?: cm.cameraIdList.firstOrNull { id ->
                cm.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun registerTorchCallback(cm: CameraManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        val id = cameraId ?: return
        val cb = object : CameraManager.TorchCallback() {
            override fun onTorchModeUnavailable(cameraId: String) {
                if (cameraId == id) {
                    torchAvailable = false
                    notifyAvailability()
                }
            }

            override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
                if (cameraId == id) {
                    torchAvailable = true
                    notifyAvailability()
                }
            }
        }
        torchCallback = cb
        cm.registerTorchCallback(cb, null)
        // Optimistic: available until told otherwise
        torchAvailable = true
    }

    private fun unregisterTorchCallback() {
        val cb = torchCallback ?: return
        try {
            cameraManager()?.unregisterTorchCallback(cb)
        } catch (_: Exception) {
        }
        torchCallback = null
    }

    private fun notifyAvailability() {
        val data = JSObject()
        data.put("available", torchAvailable)
        data.put("reason", if (torchAvailable) null else "torch-unavailable")
        notifyListeners("torchAvailabilityChanged", data)
    }
}
