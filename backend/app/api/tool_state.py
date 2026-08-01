import threading

# Format: thread_id -> {"type": str, "event": threading.Event(), "result": str}
pending_popups = {}
