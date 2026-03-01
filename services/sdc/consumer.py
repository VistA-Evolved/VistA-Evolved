"""
IEEE 11073 SDC Consumer — Sidecar Process

Phase 383 (W21-P6): Discovers SDC devices on the local network via
WS-Discovery, subscribes to BICEPS metrics, normalizes observations
to JSON, and POSTs them to the VistA-Evolved API ingest endpoint.

This is a scaffold implementation. In production, enable device filtering,
TLS validation, and waveform downsampling.

Environment variables:
    API_INGEST_URL      — API ingest endpoint (default: http://host.docker.internal:3001/devices/sdc/ingest)
    SDC_INGEST_SERVICE_KEY — Service auth key for X-Service-Key header
    SDC_POLL_INTERVAL_MS   — How often to push metrics (default: 5000)
    SDC_DISCOVERY_TIMEOUT_S — WS-Discovery timeout (default: 10)
    SDC_WAVEFORM_DOWNSAMPLE — Downsample waveforms (default: true)
    SDC_LOG_LEVEL          — Logging level (default: INFO)
"""

import os
import sys
import json
import time
import logging
import signal
import requests
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

API_INGEST_URL = os.environ.get(
    "API_INGEST_URL",
    "http://host.docker.internal:3001/devices/sdc/ingest",
)
SERVICE_KEY = os.environ.get(
    "SDC_INGEST_SERVICE_KEY",
    "dev-sdc-ingest-key-change-in-production",
)
POLL_INTERVAL_S = int(os.environ.get("SDC_POLL_INTERVAL_MS", "5000")) / 1000.0
DISCOVERY_TIMEOUT = int(os.environ.get("SDC_DISCOVERY_TIMEOUT_S", "10"))
WAVEFORM_DOWNSAMPLE = os.environ.get("SDC_WAVEFORM_DOWNSAMPLE", "true").lower() == "true"
LOG_LEVEL = os.environ.get("SDC_LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [SDC] %(levelname)s %(message)s",
)
log = logging.getLogger("sdc-consumer")

# Graceful shutdown flag
running = True


def handle_signal(signum, _frame):
    global running
    log.info("Received signal %d, shutting down...", signum)
    running = False


signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


# ---------------------------------------------------------------------------
# SDC Discovery + Subscription (scaffold)
# ---------------------------------------------------------------------------

def discover_devices():
    """
    Discover SDC devices on the local network via WS-Discovery.

    In production, this uses sdc11073.consumer.SdcConsumer with
    WsDiscovery to find devices. For the scaffold, we log the intent
    and return an empty device list.

    To enable real discovery:
        from sdc11073.wsdiscovery import WSDiscovery
        from sdc11073.consumer import SdcConsumer
        wsd = WSDiscovery()
        wsd.start()
        services = wsd.search_services(timeout=DISCOVERY_TIMEOUT)
        # Filter for SDC MDS devices
        # Connect SdcConsumer to each
    """
    log.info(
        "SDC discovery scaffold: would scan for %ds (real discovery needs network SDC devices)",
        DISCOVERY_TIMEOUT,
    )
    return []


def normalize_metric(device_info, metric_state):
    """
    Normalize a BICEPS MetricState to our SdcMetric JSON format.

    In production, metric_state is an sdc11073.mdib.MetricStateContainer
    with .ObservedValue, .DeterminationTime, .MetricQuality, etc.

    This scaffold shows the expected output shape.
    """
    return {
        "handle": getattr(metric_state, "Handle", "unknown"),
        "code": getattr(metric_state, "Type", {}).get("Code", ""),
        "codingSystem": "MDC",
        "displayName": getattr(metric_state, "Type", {}).get("DisplayName", ""),
        "category": "numeric",
        "value": str(getattr(metric_state, "ObservedValue", "")),
        "unit": getattr(metric_state, "Unit", {}).get("Code", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def build_ingest_payload(device_info, metrics):
    """Build the SdcIngestPayload for the API."""
    return {
        "mdsHandle": device_info.get("mdsHandle", ""),
        "manufacturer": device_info.get("manufacturer", ""),
        "modelName": device_info.get("modelName", ""),
        "serialNumber": device_info.get("serialNumber", "unknown"),
        "locationContext": device_info.get("locationContext", ""),
        "patientId": device_info.get("patientId", ""),
        "metrics": metrics,
        "capturedAt": datetime.now(timezone.utc).isoformat(),
    }


def post_to_api(payload):
    """POST normalized observations to the API ingest endpoint."""
    try:
        resp = requests.post(
            API_INGEST_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Service-Key": SERVICE_KEY,
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            log.info(
                "Ingested %d metrics -> stored %d (id=%s)",
                data.get("metricCount", 0),
                data.get("storedCount", 0),
                data.get("ingestId", "?"),
            )
        else:
            log.warning("API returned %d: %s", resp.status_code, resp.text[:200])
    except requests.RequestException as e:
        log.error("Failed to POST to API: %s", e)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    log.info("SDC Consumer sidecar starting")
    log.info("  API endpoint: %s", API_INGEST_URL)
    log.info("  Poll interval: %.1fs", POLL_INTERVAL_S)
    log.info("  Discovery timeout: %ds", DISCOVERY_TIMEOUT)
    log.info("  Waveform downsample: %s", WAVEFORM_DOWNSAMPLE)

    devices = discover_devices()

    if not devices:
        log.info(
            "No SDC devices discovered. Sidecar will poll every %.1fs for new devices.",
            POLL_INTERVAL_S,
        )

    cycle = 0
    while running:
        cycle += 1

        # Re-discover periodically (every 12 cycles = ~1 min at 5s interval)
        if cycle % 12 == 0:
            new_devices = discover_devices()
            if new_devices:
                devices = new_devices
                log.info("Updated device list: %d devices", len(devices))

        # For each connected device, read metrics and ingest
        for device in devices:
            try:
                # In production: read metric states from SdcConsumer MDIB
                # metrics = [normalize_metric(device, m) for m in device.mdib.metric_states]
                # payload = build_ingest_payload(device, metrics)
                # post_to_api(payload)
                pass
            except Exception as e:
                log.error("Error reading device %s: %s", device.get("serialNumber", "?"), e)

        time.sleep(POLL_INTERVAL_S)

    log.info("SDC Consumer sidecar stopped")


if __name__ == "__main__":
    main()
