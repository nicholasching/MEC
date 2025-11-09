#!/usr/bin/env python3
"""
BLE Advertisement Communication Test Script
Tests communication using chunked BLE advertisements only (no GATT)

Requirements:
    pip install bleak

Usage:
    python test_ble_advertisement.py
"""

import asyncio
import sys
from bleak import BleakScanner
from bleak.backends.scanner import AdvertisementData
import struct
from collections import defaultdict
from datetime import datetime, timedelta

# Advertisement chunking constants (must match Android implementation)
MANUFACTURER_ID = 0xFFFF
MAX_MESSAGE_DATA_BYTES = 24  # Max bytes per chunk for message data (reduced from 25 to 24 for messageID)
CHUNK_TIMEOUT_SECONDS = 5  # Timeout for receiving all chunks

class MessageReconstructor:
    """Reconstructs full messages from advertisement chunks with messageID tracking"""
    
    def __init__(self, timeout_seconds=CHUNK_TIMEOUT_SECONDS):
        self.chunks: defaultdict[str, dict[int, tuple[bytes, int]]] = defaultdict(dict)  # device -> chunk_index -> (data, messageId)
        self.chunk_timestamps: defaultdict[str, dict[int, datetime]] = defaultdict(dict)
        self.current_message_ids: dict[str, int] = {}  # device -> current messageID being received
        self.completed_message_ids: defaultdict[str, set[int]] = defaultdict(set)  # device -> set of completed messageIDs
        self.current_messages: dict[str, str] = {}  # device -> current partial message (for live display)
        self.timeout_seconds = timeout_seconds
    
    def add_chunk(self, device_address: str, chunk_index: int, total_chunks: int, data: bytes, message_id: int) -> tuple[str | None, bool]:
        """
        Add a chunk and return (full_message, is_new_message) if all chunks are received.
        Returns (None, False) if message is not complete yet.
        Second return value indicates if this is a new unique message (not a duplicate).
        """
        now = datetime.now()
        
        # FIRST: Check if we've already completed this message - ignore completely
        if message_id in self.completed_message_ids[device_address]:
            # Ignore duplicate message - don't process at all
            return (None, False)
        
        # Check if messageID changed - if so, clear buffer and start new message
        if device_address in self.current_message_ids:
            if self.current_message_ids[device_address] != message_id:
                print(f"🔄 [{device_address}] MessageID changed: {self.current_message_ids[device_address]} -> {message_id}. Clearing buffer.")
                self.chunks[device_address].clear()
                self.chunk_timestamps[device_address].clear()
                self.current_messages[device_address] = ""
        
        # Update current messageID
        self.current_message_ids[device_address] = message_id
        
        # Store chunk (with messageID)
        self.chunks[device_address][chunk_index] = (data, message_id)
        self.chunk_timestamps[device_address][chunk_index] = now
        
        # Update current message for live display
        message_parts = []
        for i in sorted(self.chunks[device_address].keys()):
            chunk_data, _ = self.chunks[device_address][i]
            message_parts.append(chunk_data)
        
        try:
            partial_message = b''.join(message_parts).decode('utf-8', errors='replace')
            self.current_messages[device_address] = partial_message
        except:
            pass
        
        # Check for old chunks and remove them
        self._cleanup_old_chunks(device_address, now)
        
        # Check if we have all chunks
        if len(self.chunks[device_address]) == total_chunks:
            # Double-check we haven't completed this messageID already (race condition protection)
            if message_id in self.completed_message_ids[device_address]:
                # Already completed, ignore and clear any stale chunks
                if device_address in self.chunks:
                    self.chunks[device_address].clear()
                if device_address in self.chunk_timestamps:
                    self.chunk_timestamps[device_address].clear()
                return (None, False)
            
            # Verify we have all chunks from 0 to total_chunks-1 with same messageID
            chunks_list = []
            valid_chunks = True
            for i in range(total_chunks):
                if i not in self.chunks[device_address]:
                    # Missing chunk - not ready yet
                    valid_chunks = False
                    break
                chunk_data, chunk_message_id = self.chunks[device_address][i]
                if chunk_message_id != message_id:
                    # Different messageID - invalid, clear and ignore
                    print(f"⚠️ [{device_address}] Chunk {i} has different messageID ({chunk_message_id} vs {message_id}). Clearing.")
                    self.chunks[device_address].clear()
                    self.chunk_timestamps[device_address].clear()
                    valid_chunks = False
                    break
                chunks_list.append(chunk_data)
            
            if not valid_chunks:
                return (None, False)
            
            # Reconstruct message
            full_message_bytes = b''.join(chunks_list)
            try:
                message = full_message_bytes.decode('utf-8')
                
                # Mark message as completed IMMEDIATELY (before clearing chunks) - this is critical!
                self.completed_message_ids[device_address].add(message_id)
                
                # Clear chunks for this device AFTER marking as completed
                if device_address in self.chunks:
                    del self.chunks[device_address]
                if device_address in self.chunk_timestamps:
                    del self.chunk_timestamps[device_address]
                if device_address in self.current_messages:
                    del self.current_messages[device_address]
                # Keep current_message_ids to track the last messageID we saw
                
                return (message, True)  # New unique message
            except UnicodeDecodeError as e:
                print(f"❌ Error decoding message from {device_address}: {e}")
                # Clear invalid chunks
                if device_address in self.chunks:
                    self.chunks[device_address].clear()
                if device_address in self.chunk_timestamps:
                    self.chunk_timestamps[device_address].clear()
                return (None, False)
        
        return (None, False)  # Message not complete yet
    
    def _cleanup_old_chunks(self, device_address: str, now: datetime):
        """Remove chunks older than timeout"""
        if device_address not in self.chunk_timestamps:
            return
        
        chunks_to_remove = []
        for chunk_index, timestamp in self.chunk_timestamps[device_address].items():
            if (now - timestamp).total_seconds() > self.timeout_seconds:
                chunks_to_remove.append(chunk_index)
        
        for chunk_index in chunks_to_remove:
            del self.chunks[device_address][chunk_index]
            del self.chunk_timestamps[device_address][chunk_index]
        
        # If no chunks left, remove device entry
        if not self.chunks[device_address]:
            del self.chunks[device_address]
            if device_address in self.chunk_timestamps:
                del self.chunk_timestamps[device_address]

class BLETestClient:
    def __init__(self):
        self.reconstructor = MessageReconstructor()
        self.received_messages: list[tuple[str, str, datetime]] = []  # (device_address, message, timestamp)
        self.received_message_keys: set[tuple[str, int]] = set()  # (device_address, message_id) - track what we've displayed
        
    def parse_advertisement_chunk(self, device_address: str, manufacturer_data: dict) -> tuple[int, int, bytes, int] | None:
        """
        Parse chunk from manufacturer data.
        Returns (chunk_index, total_chunks, message_data, message_id) or None if not our data.
        """
        # Look for our manufacturer ID (0xFFFF)
        if MANUFACTURER_ID not in manufacturer_data:
            return None
        
        data = manufacturer_data[MANUFACTURER_ID]
        
        # Format: [chunk_index (1 byte), total_chunks (1 byte), message_data (up to 24 bytes), message_id (1 byte)]
        if len(data) < 3:  # At least chunk_index + total_chunks + message_id
            return None
        
        chunk_index = data[0]
        total_chunks = data[1]
        message_id = data[-1]  # Last byte is messageID
        message_data = data[2:-1] if len(data) > 3 else b''  # Data between metadata and messageID
        
        return (chunk_index, total_chunks, message_data, message_id)
    
    async def scan_for_devices(self, timeout=30.0):
        """Scan for BLE devices with chunked advertisements"""
        print("🔍 Scanning for BLE devices with chunked advertisements...")
        print(f"Manufacturer ID: 0x{MANUFACTURER_ID:04X}")
        print(f"Max message data per chunk: {MAX_MESSAGE_DATA_BYTES} bytes")
        print(f"Chunk format: [chunkIndex, totalChunks, messageData (up to {MAX_MESSAGE_DATA_BYTES} bytes), messageID]")
        print(f"Chunk timeout: {CHUNK_TIMEOUT_SECONDS} seconds")
        print(f"Scanning for {timeout} seconds...")
        print(f"Messages are tracked by messageID - duplicates are ignored.")
        print(f"Live message preview is shown as chunks are received.")
        print()
        
        devices_found = set()
        last_display_time = {}
        display_interval = 0.5  # Update display every 0.5 seconds
        
        def detection_callback(device, advertisement_data: AdvertisementData):
            try:
                # Check for manufacturer data
                if not advertisement_data.manufacturer_data:
                    return
                
                # Parse chunk
                chunk_info = self.parse_advertisement_chunk(device.address, advertisement_data.manufacturer_data)
                if chunk_info is None:
                    return
                
                chunk_index, total_chunks, message_data, message_id = chunk_info
                device_name = advertisement_data.local_name or device.address
                
                # Create message key for duplicate detection
                message_key = (device.address, message_id)
                
                # Check if we've already displayed this exact message (early exit)
                if message_key in self.received_message_keys:
                    # Already displayed - skip completely
                    return
                
                # Check if this messageID was already completed (early exit to avoid processing)
                # This MUST be checked before calling add_chunk to prevent any processing of duplicates
                if message_id in self.reconstructor.completed_message_ids[device.address]:
                    # Mark as displayed to prevent future processing
                    self.received_message_keys.add(message_key)
                    # Skip processing duplicate messages completely - return immediately
                    return
                
                # Add chunk to reconstructor
                message, is_new_message = self.reconstructor.add_chunk(
                    device.address,
                    chunk_index,
                    total_chunks,
                    message_data,
                    message_id
                )
                
                # Check if completed (may have been completed during add_chunk)
                is_now_completed = message_id in self.reconstructor.completed_message_ids[device.address]
                
                if message and is_new_message and is_now_completed:
                    # Double-check we haven't displayed this (race condition protection)
                    if message_key in self.received_message_keys:
                        # Already displayed - skip
                        return
                    
                    # Mark as displayed BEFORE printing (prevents race conditions)
                    self.received_message_keys.add(message_key)
                    
                    # Full message reconstructed!
                    timestamp = datetime.now()
                    self.received_messages.append((device.address, message, timestamp))
                    
                    print(f"\n✅ NEW MESSAGE from {device_name} ({device.address}) [messageID={message_id}]:")
                    print(f"   {message}")
                    print(f"   ({len(message)} chars, {total_chunks} chunks)")
                    print()
                    
                    if device.address not in devices_found:
                        devices_found.add(device.address)
                        print(f"📱 Device: {device_name} ({device.address})")
                        print(f"   RSSI: {advertisement_data.rssi}")
                        print()
                elif not is_now_completed:
                    # Partial message - show live progress only if not completed
                    # Check if we have chunks (may have been cleared if message was completed)
                    if device.address in self.reconstructor.chunks:
                        chunks_received = len(self.reconstructor.chunks[device.address])
                        current_message = self.reconstructor.current_messages.get(device.address, "")
                        
                        # Only show progress if we have chunks
                        if chunks_received > 0:
                            # Throttle display updates
                            now = datetime.now()
                            last_time = last_display_time.get(device.address)
                            if last_time is None or (now - last_time).total_seconds() >= display_interval:
                                last_display_time[device.address] = now
                                
                                # Clear line and show progress (for live updates)
                                print(f"\r📦 [{device_name}] Chunk {chunk_index + 1}/{total_chunks} ({chunks_received}/{total_chunks}) [ID={message_id}] | Current: {current_message[:50]}", end="", flush=True)
                # If is_now_completed is True and we don't have a message, it means it was a duplicate - silently ignore
                    
            except Exception as e:
                print(f"\n❌ Error processing advertisement: {e}")
                import traceback
                traceback.print_exc()
        
        async with BleakScanner(detection_callback=detection_callback):
            await asyncio.sleep(timeout)
        
        return list(devices_found)

async def main():
    """Main test function"""
    print("=" * 60)
    print("BLE Advertisement Communication Test Script")
    print("=" * 60)
    print()
    print("This script scans for devices sending chunked messages via BLE advertisements.")
    print("Messages are sent in chunks of up to 24 bytes per advertisement.")
    print("Each chunk includes a messageID to track unique messages and ignore duplicates.")
    print()
    print("Note: Sending advertisements from Python/Windows is not easily supported.")
    print("      Use the Android app to send messages.")
    print()
    print("=" * 60)
    print()
    
    client = BLETestClient()
    
    try:
        # Scan for devices
        devices = await client.scan_for_devices(timeout=30.0)
        
        print("=" * 60)
        print("Scan Results")
        print("=" * 60)
        print()
        
        if not client.received_messages:
            print("❌ No messages received")
            print("Make sure the Android app is advertising")
            return
        
        print(f"✅ Received {len(client.received_messages)} message(s):")
        print()
        
        for i, (device_address, message, timestamp) in enumerate(client.received_messages, 1):
            print(f"{i}. From {device_address} at {timestamp.strftime('%H:%M:%S')}:")
            print(f"   {message}")
            print()
        
        print("=" * 60)
        print("Scanning completed")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

