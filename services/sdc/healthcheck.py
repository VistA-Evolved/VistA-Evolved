"""Simple healthcheck: verify sdc11073 is importable."""
try:
    import sdc11073
    print("ok")
except ImportError:
    print("sdc11073 not available")
    exit(1)
